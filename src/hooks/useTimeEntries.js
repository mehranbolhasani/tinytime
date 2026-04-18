import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assertSupabaseClient, getFriendlySupabaseError } from '@/lib/supabase'
import { computeDuration } from '@/lib/utils'

const TIME_ENTRIES_QUERY_KEY = ['time_entries']
const ENTRY_SELECT = '*, projects(id, name, color)'

function getEntryFromCache(queryClient, id) {
  const cachedEntries = queryClient.getQueriesData({ queryKey: TIME_ENTRIES_QUERY_KEY })

  for (const [, entries] of cachedEntries) {
    if (!Array.isArray(entries)) {
      continue
    }

    const match = entries.find((entry) => entry.id === id)
    if (match) {
      return match
    }
  }

  return null
}

function toEntryIds(entries) {
  return entries
    .map((entry) => entry.id)
    .filter(Boolean)
    .sort()
}

export function useTimeEntriesList({ from, to }) {
  const supabase = assertSupabaseClient()

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: [...TIME_ENTRIES_QUERY_KEY, { from, to }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select(ENTRY_SELECT)
        .gte('started_at', from)
        .lt('started_at', to)
        .order('started_at', { ascending: true })

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to load time entries.'))
      }

      return data ?? []
    },
    enabled: Boolean(from && to),
  })

  const entryIds = useMemo(() => toEntryIds(entries), [entries])
  const entryIdsKey = useMemo(() => entryIds.join(','), [entryIds])

  const { data: entryTagRows = [] } = useQuery({
    queryKey: ['entry_tags', entryIdsKey],
    queryFn: async () => {
      if (entryIds.length === 0) {
        return []
      }

      const { data, error } = await supabase
        .from('time_entry_tags')
        .select('time_entry_id, tags(id, name, color)')
        .in('time_entry_id', entryIds)

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to load entry tags.'))
      }

      return data ?? []
    },
    enabled: entryIds.length > 0,
  })

  const entryTagsByEntryId = useMemo(() => {
    const map = {}

    entryTagRows.forEach((row) => {
      if (!row.time_entry_id) {
        return
      }

      const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags
      if (!tag) {
        return
      }

      if (!map[row.time_entry_id]) {
        map[row.time_entry_id] = []
      }

      map[row.time_entry_id].push(tag)
    })

    Object.keys(map).forEach((entryId) => {
      map[entryId] = map[entryId].sort((a, b) => a.name.localeCompare(b.name))
    })

    return map
  }, [entryTagRows])

  const activeEntry = entries.find((entry) => entry.stopped_at === null) ?? null

  return {
    entries,
    isLoading,
    error,
    entryTagsByEntryId,
    activeEntry,
  }
}

export function useActiveTimeEntry() {
  const supabase = assertSupabaseClient()

  const { data: activeEntry = null, isLoading, error } = useQuery({
    queryKey: [...TIME_ENTRIES_QUERY_KEY, 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select(ENTRY_SELECT)
        .is('stopped_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to load active timer entry.'))
      }

      return data ?? null
    },
  })

  return {
    activeEntry,
    isLoading,
    error,
  }
}

export function useTimeEntryMutations({ entries = [] } = {}) {
  const queryClient = useQueryClient()
  const supabase = assertSupabaseClient()

  const invalidateEntryQueries = () => {
    queryClient.invalidateQueries({ queryKey: TIME_ENTRIES_QUERY_KEY })
    queryClient.invalidateQueries({ queryKey: ['entry_tags'] })
  }

  const createEntryMutation = useMutation({
    mutationFn: async ({ project_id, description, started_at, stopped_at = null, duration_seconds = null }) => {
      const payload = {
        project_id: project_id ?? null,
        description: description?.trim() ? description.trim() : null,
        started_at,
        stopped_at,
        duration_seconds,
      }

      const { data, error } = await supabase
        .from('time_entries')
        .insert(payload)
        .select(ENTRY_SELECT)
        .single()

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to create timer entry.'))
      }

      return data
    },
    onSuccess: invalidateEntryQueries,
  })

  const stopEntryMutation = useMutation({
    mutationFn: async ({ id, stopped_at }) => {
      const entry = entries.find((item) => item.id === id) ?? getEntryFromCache(queryClient, id)
      if (!entry?.started_at) {
        throw new Error('Unable to stop timer entry without a valid start time.')
      }

      const duration_seconds = computeDuration(entry.started_at, stopped_at)
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          stopped_at,
          duration_seconds,
        })
        .eq('id', id)
        .select(ENTRY_SELECT)
        .single()

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to stop timer entry.'))
      }

      return data
    },
    onSuccess: invalidateEntryQueries,
  })

  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const payload = {
        ...updates,
        project_id: updates.project_id ?? null,
        description: updates.description?.trim() ? updates.description.trim() : null,
      }

      const { data, error } = await supabase
        .from('time_entries')
        .update(payload)
        .eq('id', id)
        .select(ENTRY_SELECT)
        .single()

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to update timer entry.'))
      }

      return data
    },
    onSuccess: invalidateEntryQueries,
  })

  const deleteEntryMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('time_entries').delete().eq('id', id)

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to delete timer entry.'))
      }

      return id
    },
    onSuccess: invalidateEntryQueries,
  })

  const createEntry = async ({ project_id, description, started_at, stopped_at, duration_seconds }) =>
    createEntryMutation.mutateAsync({ project_id, description, started_at, stopped_at, duration_seconds })

  const stopEntry = async (id, stopped_at) => stopEntryMutation.mutateAsync({ id, stopped_at })

  const updateEntry = async (id, updates) => updateEntryMutation.mutateAsync({ id, updates })

  const deleteEntry = async (id) => deleteEntryMutation.mutateAsync(id)

  return {
    createEntry,
    stopEntry,
    updateEntry,
    deleteEntry,
  }
}

export function useTimeEntries({ from, to }) {
  const list = useTimeEntriesList({ from, to })
  const mutations = useTimeEntryMutations({ entries: list.entries })

  return {
    ...list,
    ...mutations,
  }
}
