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

export function useTimeEntries({ from, to }) {
  const queryClient = useQueryClient()
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

  const entryIds = useMemo(() => entries.map((entry) => entry.id).sort(), [entries])

  const { data: entryTagRows = [] } = useQuery({
    queryKey: ['entry_tags', entryIds],
    queryFn: async () => {
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

  const createEntryMutation = useMutation({
    mutationFn: async ({ project_id, description, started_at }) => {
      const payload = {
        project_id: project_id ?? null,
        description: description?.trim() ? description.trim() : null,
        started_at,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIME_ENTRIES_QUERY_KEY })
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIME_ENTRIES_QUERY_KEY })
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIME_ENTRIES_QUERY_KEY })
    },
  })

  const deleteEntryMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('time_entries').delete().eq('id', id)

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to delete timer entry.'))
      }

      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIME_ENTRIES_QUERY_KEY })
    },
  })

  const activeEntry = entries.find((entry) => entry.stopped_at === null) ?? null

  const createEntry = async ({ project_id, description, started_at }) =>
    createEntryMutation.mutateAsync({ project_id, description, started_at })

  const stopEntry = async (id, stopped_at) => stopEntryMutation.mutateAsync({ id, stopped_at })

  const updateEntry = async (id, updates) => updateEntryMutation.mutateAsync({ id, updates })

  const deleteEntry = async (id) => deleteEntryMutation.mutateAsync(id)

  return {
    entries,
    isLoading,
    error,
    entryTagsByEntryId,
    createEntry,
    stopEntry,
    updateEntry,
    deleteEntry,
    activeEntry,
  }
}
