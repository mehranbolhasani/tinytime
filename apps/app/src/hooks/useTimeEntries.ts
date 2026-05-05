import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assertSupabaseClient, getFriendlySupabaseError } from '@/lib/supabase'
import { computeDuration } from '@/lib/utils'
import type { TimeEntry, DayRange } from '@/types'

const TIME_ENTRIES_QUERY_KEY = ['time_entries']
const ENTRY_SELECT = '*, projects(id, name, color)'

function getEntryFromCache(queryClient: ReturnType<typeof useQueryClient>, id: string): TimeEntry | null {
  const cachedEntries = queryClient.getQueriesData<TimeEntry[] | null>({ queryKey: TIME_ENTRIES_QUERY_KEY })

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

function sortEntriesByStartedAt(entries: TimeEntry[]): TimeEntry[] {
  return [...entries].sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  )
}

function isEntryInRange(entry: TimeEntry, range: unknown): boolean {
  if (!range || typeof range !== 'object' || Array.isArray(range)) {
    return true
  }

  const { from, to } = range as Partial<DayRange>
  if (!from || !to) {
    return true
  }

  const startedAtMs = new Date(entry.started_at).getTime()
  const fromMs = new Date(from).getTime()
  const toMs = new Date(to).getTime()

  if (Number.isNaN(startedAtMs) || Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    return true
  }

  return startedAtMs >= fromMs && startedAtMs < toMs
}

function updateEntryListCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (entries: TimeEntry[], range: unknown) => TimeEntry[]
): void {
  const cachedEntries = queryClient.getQueriesData<TimeEntry[] | null>({ queryKey: TIME_ENTRIES_QUERY_KEY })

  cachedEntries.forEach(([queryKey, entries]) => {
    if (!Array.isArray(entries)) {
      return
    }

    const range = queryKey[1]
    const nextEntries = updater(entries, range)

    if (nextEntries !== entries) {
      queryClient.setQueryData(queryKey, nextEntries)
    }
  })
}

interface UseTimeEntriesListResult {
  entries: TimeEntry[]
  isLoading: boolean
  error: Error | null
  activeEntry: TimeEntry | null
}

export function useTimeEntriesList({ from, to }: Partial<DayRange>): UseTimeEntriesListResult {
  const supabase = assertSupabaseClient()

  const { data: entries = [], isLoading, error } = useQuery<TimeEntry[], Error>({
    queryKey: [...TIME_ENTRIES_QUERY_KEY, { from, to }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select(ENTRY_SELECT)
        .gte('started_at', from!)
        .lt('started_at', to!)
        .order('started_at', { ascending: true })

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to load time entries.'))
      }

      return (data ?? []) as TimeEntry[]
    },
    enabled: Boolean(from && to),
    placeholderData: (previousData) => previousData,
  })

  const activeEntry = entries.find((entry) => entry.stopped_at === null) ?? null

  return {
    entries,
    isLoading,
    error,
    activeEntry,
  }
}

interface UseActiveTimeEntryResult {
  activeEntry: TimeEntry | null
  isLoading: boolean
  error: Error | null
}

export function useActiveTimeEntry(): UseActiveTimeEntryResult {
  const supabase = assertSupabaseClient()

  const { data: activeEntry = null, isLoading, error } = useQuery<TimeEntry | null, Error>({
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

      return (data as TimeEntry | null) ?? null
    },
  })

  return {
    activeEntry,
    isLoading,
    error,
  }
}

interface CreateEntryInput {
  project_id?: string | null
  description?: string | null
  started_at: string
  stopped_at?: string | null
  duration_seconds?: number | null
}

interface UseTimeEntryMutationsResult {
  createEntry: (input: CreateEntryInput) => Promise<TimeEntry>
  stopEntry: (id: string, stopped_at: string) => Promise<TimeEntry>
  updateEntry: (id: string, updates: Partial<TimeEntry>) => Promise<TimeEntry>
  deleteEntry: (id: string) => Promise<string>
}

export function useTimeEntryMutations({ entries = [] }: { entries?: TimeEntry[] } = {}): UseTimeEntryMutationsResult {
  const queryClient = useQueryClient()
  const supabase = assertSupabaseClient()

  const revalidateInactiveEntryQueries = () => {
    queryClient.invalidateQueries({ queryKey: TIME_ENTRIES_QUERY_KEY, refetchType: 'inactive' })
  }

  const createEntryMutation = useMutation<TimeEntry, Error, CreateEntryInput>({
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

      return data as TimeEntry
    },
    onSuccess: (createdEntry) => {
      queryClient.setQueryData(
        [...TIME_ENTRIES_QUERY_KEY, 'active'],
        createdEntry.stopped_at === null ? createdEntry : null
      )

      updateEntryListCaches(queryClient, (cachedEntries, range) => {
        if (!isEntryInRange(createdEntry, range)) {
          return cachedEntries
        }

        const existingIndex = cachedEntries.findIndex((entry) => entry.id === createdEntry.id)
        if (existingIndex >= 0) {
          const nextEntries = [...cachedEntries]
          nextEntries[existingIndex] = createdEntry
          return sortEntriesByStartedAt(nextEntries)
        }

        return sortEntriesByStartedAt([...cachedEntries, createdEntry])
      })

      revalidateInactiveEntryQueries()
    },
  })

  const stopEntryMutation = useMutation<TimeEntry, Error, { id: string; stopped_at: string }>({
    mutationFn: async ({ id, stopped_at }) => {
      const entry = entries.find((item) => item.id === id) ?? getEntryFromCache(queryClient, id)
      let startedAt = entry?.started_at ?? null

      if (!startedAt) {
        const { data: entryById, error: entryByIdError } = await supabase
          .from('time_entries')
          .select('id, started_at')
          .eq('id', id)
          .single()

        if (entryByIdError) {
          throw new Error(getFriendlySupabaseError(entryByIdError, 'Unable to load timer entry details.'))
        }

        startedAt = (entryById as { started_at: string } | null)?.started_at ?? null
      }

      if (!startedAt) {
        throw new Error('Unable to stop timer entry without a valid start time.')
      }

      const duration_seconds = computeDuration(startedAt, stopped_at)
      const { data, error } = await supabase
        .from('time_entries')
        .update({ stopped_at, duration_seconds })
        .eq('id', id)
        .select(ENTRY_SELECT)
        .single()

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to stop timer entry.'))
      }

      return data as TimeEntry
    },
    onSuccess: (stoppedEntry) => {
      queryClient.setQueryData([...TIME_ENTRIES_QUERY_KEY, 'active'], null)

      updateEntryListCaches(queryClient, (cachedEntries, range) => {
        if (!isEntryInRange(stoppedEntry, range)) {
          return cachedEntries.filter((entry) => entry.id !== stoppedEntry.id)
        }

        const existingIndex = cachedEntries.findIndex((entry) => entry.id === stoppedEntry.id)
        if (existingIndex === -1) {
          return sortEntriesByStartedAt([...cachedEntries, stoppedEntry])
        }

        const nextEntries = [...cachedEntries]
        nextEntries[existingIndex] = stoppedEntry
        return sortEntriesByStartedAt(nextEntries)
      })

      revalidateInactiveEntryQueries()
    },
  })

  const updateEntryMutation = useMutation<TimeEntry, Error, { id: string; updates: Partial<TimeEntry> }>({
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

      return data as TimeEntry
    },
    onSuccess: (updatedEntry) => {
      updateEntryListCaches(queryClient, (cachedEntries, range) => {
        const withoutUpdated = cachedEntries.filter((entry) => entry.id !== updatedEntry.id)

        if (!isEntryInRange(updatedEntry, range)) {
          return withoutUpdated.length === cachedEntries.length ? cachedEntries : withoutUpdated
        }

        return sortEntriesByStartedAt([...withoutUpdated, updatedEntry])
      })

      const cachedActiveEntry = queryClient.getQueryData<TimeEntry | null>([...TIME_ENTRIES_QUERY_KEY, 'active'])
      if (cachedActiveEntry?.id === updatedEntry.id) {
        queryClient.setQueryData(
          [...TIME_ENTRIES_QUERY_KEY, 'active'],
          updatedEntry.stopped_at === null ? updatedEntry : null
        )
      }

      revalidateInactiveEntryQueries()
    },
  })

  const deleteEntryMutation = useMutation<string, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase.from('time_entries').delete().eq('id', id)

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to delete timer entry.'))
      }

      return id
    },
    onSuccess: (deletedId) => {
      updateEntryListCaches(
        queryClient,
        (cachedEntries) => cachedEntries.filter((entry) => entry.id !== deletedId)
      )

      const cachedActiveEntry = queryClient.getQueryData<TimeEntry | null>([...TIME_ENTRIES_QUERY_KEY, 'active'])
      if (cachedActiveEntry?.id === deletedId) {
        queryClient.setQueryData([...TIME_ENTRIES_QUERY_KEY, 'active'], null)
      }

      revalidateInactiveEntryQueries()
    },
  })

  const createEntry = (input: CreateEntryInput) => createEntryMutation.mutateAsync(input)
  const stopEntry = (id: string, stopped_at: string) => stopEntryMutation.mutateAsync({ id, stopped_at })
  const updateEntry = (id: string, updates: Partial<TimeEntry>) => updateEntryMutation.mutateAsync({ id, updates })
  const deleteEntry = (id: string) => deleteEntryMutation.mutateAsync(id)

  return {
    createEntry,
    stopEntry,
    updateEntry,
    deleteEntry,
  }
}

export function useTimeEntries({ from, to }: Partial<DayRange>) {
  const list = useTimeEntriesList({ from, to })
  const mutations = useTimeEntryMutations({ entries: list.entries })

  return {
    ...list,
    ...mutations,
  }
}
