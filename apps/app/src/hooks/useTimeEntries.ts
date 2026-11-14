import { useCallback } from 'react'
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Query, QueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { assertSupabaseClient, getFriendlySupabaseError } from '@/lib/supabase'
import { computeDuration } from '@/lib/utils'
import type { Project, TimeEntry, DayRange } from '@/types'

export const TIME_ENTRIES_QUERY_KEY = ['time_entries']
export const ACTIVE_ENTRY_QUERY_KEY = ['time_entries', 'active'] as const
const ENTRY_SELECT = '*, projects(id, name, color)'

/** Stable fallback so the dial's memos survive a render with no data yet. */
const EMPTY_ENTRIES: TimeEntry[] = []

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

const isListQuery = (query: Query) => query.queryKey[1] !== 'active'

/** Only queries that already delivered data can overwrite an optimistic row. */
const isCancellableList = (query: Query) => isListQuery(query) && query.state.data !== undefined

async function cancelEntryLists(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: TIME_ENTRIES_QUERY_KEY, predicate: isCancellableList })
}

/** Writes an updated entry into every list cache plus the active-entry cache. */
function applyUpdatedEntry(queryClient: QueryClient, updatedEntry: TimeEntry): void {
  updateEntryListCaches(queryClient, (cachedEntries, range) => {
    const withoutUpdated = cachedEntries.filter((entry) => entry.id !== updatedEntry.id)

    if (!isEntryInRange(updatedEntry, range)) {
      return withoutUpdated.length === cachedEntries.length ? cachedEntries : withoutUpdated
    }

    return sortEntriesByStartedAt([...withoutUpdated, updatedEntry])
  })

  const cachedActiveEntry = queryClient.getQueryData<TimeEntry | null>(ACTIVE_ENTRY_QUERY_KEY)
  if (cachedActiveEntry?.id === updatedEntry.id) {
    queryClient.setQueryData(
      ACTIVE_ENTRY_QUERY_KEY,
      updatedEntry.stopped_at === null ? updatedEntry : null
    )
  }
}

/** Adds or replaces a created (or restored) entry in every list cache that covers it. */
function applyCreatedEntry(queryClient: QueryClient, entry: TimeEntry): void {
  updateEntryListCaches(queryClient, (cachedEntries, range) => {
    if (!isEntryInRange(entry, range)) {
      return cachedEntries
    }

    const existingIndex = cachedEntries.findIndex((cachedEntry) => cachedEntry.id === entry.id)
    if (existingIndex >= 0) {
      const nextEntries = [...cachedEntries]
      nextEntries[existingIndex] = entry
      return sortEntriesByStartedAt(nextEntries)
    }

    return sortEntriesByStartedAt([...cachedEntries, entry])
  })
}

interface UseTimeEntriesListResult {
  entries: TimeEntry[]
  isLoading: boolean
  isPlaceholderData: boolean
  error: Error | null
  activeEntry: TimeEntry | null
}

export function timeEntriesListQueryOptions(supabase: SupabaseClient<Database>, range: Partial<DayRange>) {
  return queryOptions({
    queryKey: [...TIME_ENTRIES_QUERY_KEY, { from: range.from, to: range.to }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select(ENTRY_SELECT)
        .gte('started_at', range.from!)
        .lt('started_at', range.to!)
        .order('started_at', { ascending: true })

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to load time entries.'))
      }

      return data ?? []
    },
  })
}

export function useTimeEntriesList({ from, to }: Partial<DayRange>): UseTimeEntriesListResult {
  const supabase = assertSupabaseClient()

  const {
    data: entries = EMPTY_ENTRIES,
    isLoading,
    isPlaceholderData,
    error,
  } = useQuery({
    ...timeEntriesListQueryOptions(supabase, { from, to }),
    enabled: Boolean(from && to),
    placeholderData: (previousData) => previousData,
  })

  const activeEntry = entries.find((entry) => entry.stopped_at === null) ?? null

  return {
    entries,
    isLoading,
    isPlaceholderData,
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
    queryKey: ACTIVE_ENTRY_QUERY_KEY,
    // Always resync the running timer when returning to the tab or PWA, including on mobile (other devices may have started or stopped it).
    refetchOnWindowFocus: true,
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

interface CreateEntryInput {
  project_id?: string | null
  description?: string | null
  started_at: string
  stopped_at?: string | null
  duration_seconds?: number | null
}

type TimeEntryUpdate = Partial<
  Pick<TimeEntry, 'started_at' | 'stopped_at' | 'duration_seconds' | 'description' | 'project_id'>
>

interface UpdateEntryVars {
  id: string
  updates: TimeEntryUpdate
}

interface MutationContext {
  previous: TimeEntry | null
}

function buildEntryUpdatePayload(
  updates: TimeEntryUpdate
): Database['public']['Tables']['time_entries']['Update'] {
  const payload: Record<string, unknown> = {}
  if ('started_at' in updates) payload.started_at = updates.started_at
  if ('stopped_at' in updates) payload.stopped_at = updates.stopped_at
  if ('duration_seconds' in updates) payload.duration_seconds = updates.duration_seconds
  if ('project_id' in updates) payload.project_id = updates.project_id ?? null
  if ('description' in updates) {
    const trimmed = updates.description?.trim()
    payload.description = trimmed ? trimmed : null
  }
  return payload
}

/**
 * Applies the same normalisation as `buildEntryUpdatePayload` to produce the row
 * the server will store, so the optimistic cache entry matches the real one.
 */
function normaliseEntryUpdates(updates: TimeEntryUpdate): Partial<TimeEntry> {
  const normalised: Partial<TimeEntry> = {}
  if ('started_at' in updates) normalised.started_at = updates.started_at
  if ('stopped_at' in updates) normalised.stopped_at = updates.stopped_at
  if ('duration_seconds' in updates) normalised.duration_seconds = updates.duration_seconds
  if ('project_id' in updates) normalised.project_id = updates.project_id ?? null
  if ('description' in updates) {
    const trimmed = updates.description?.trim()
    normalised.description = trimmed ? trimmed : null
  }
  return normalised
}

interface UseTimeEntryMutationsResult {
  createEntry: (input: CreateEntryInput) => Promise<TimeEntry>
  stopEntry: (id: string, stopped_at: string, startedAt?: string) => Promise<TimeEntry>
  updateEntry: (id: string, updates: TimeEntryUpdate) => Promise<TimeEntry>
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

      return data
    },
    onSuccess: (createdEntry) => {
      if (createdEntry.stopped_at === null) {
        queryClient.setQueryData(ACTIVE_ENTRY_QUERY_KEY, createdEntry)
      }

      applyCreatedEntry(queryClient, createdEntry)
      revalidateInactiveEntryQueries()
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ACTIVE_ENTRY_QUERY_KEY })
    },
  })

  const stopEntryMutation = useMutation<
    TimeEntry,
    Error,
    { id: string; stopped_at: string; started_at?: string }
  >({
    mutationFn: async ({ id, stopped_at, started_at: providedStartedAt }) => {
      let startedAt = providedStartedAt ?? null

      if (!startedAt) {
        const entry = entries.find((item) => item.id === id) ?? getEntryFromCache(queryClient, id)
        startedAt = entry?.started_at ?? null

        if (!startedAt) {
          const { data: entryById, error: entryByIdError } = await supabase
            .from('time_entries')
            .select('id, started_at')
            .eq('id', id)
            .single()

          if (entryByIdError) {
            throw new Error(getFriendlySupabaseError(entryByIdError, 'Unable to load timer entry details.'))
          }

          startedAt = entryById?.started_at ?? null
        }
      }

      if (!startedAt) {
        throw new Error('Unable to stop timer entry without a valid start time.')
      }

      const duration_seconds = computeDuration(startedAt, stopped_at)
      const { data, error } = await supabase
        .from('time_entries')
        .update({ stopped_at, duration_seconds })
        .eq('id', id)
        .is('stopped_at', null)
        .select(ENTRY_SELECT)
        .maybeSingle()

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to stop timer entry.'))
      }

      if (!data) {
        // Already stopped (e.g. on another device) or deleted: return the current row unchanged.
        const { data: current, error: currentError } = await supabase
          .from('time_entries')
          .select(ENTRY_SELECT)
          .eq('id', id)
          .maybeSingle()

        if (currentError) {
          throw new Error(getFriendlySupabaseError(currentError, 'Unable to stop timer entry.'))
        }
        if (!current) {
          throw new Error('This timer entry no longer exists.')
        }
        return current
      }

      return data
    },
    onSuccess: (stoppedEntry) => {
      const cachedActiveEntry = queryClient.getQueryData<TimeEntry | null>(ACTIVE_ENTRY_QUERY_KEY)
      if (cachedActiveEntry?.id === stoppedEntry.id) {
        queryClient.setQueryData(ACTIVE_ENTRY_QUERY_KEY, null)
      }

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

  const updateEntryMutation = useMutation<TimeEntry, Error, UpdateEntryVars, MutationContext>({
    mutationFn: async ({ id, updates }) => {
      const payload = buildEntryUpdatePayload(updates)

      if (Object.keys(payload).length === 0) {
        throw new Error('Nothing to update.')
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
    onMutate: async ({ id, updates }) => {
      await cancelEntryLists(queryClient)

      const previous = getEntryFromCache(queryClient, id)

      if (previous) {
        const normalised = normaliseEntryUpdates(updates)
        const optimistic: TimeEntry = { ...previous, ...normalised }

        if ('project_id' in normalised) {
          const projectId = optimistic.project_id
          const project = projectId
            ? queryClient.getQueryData<Project[]>(['projects'])?.find((item) => item.id === projectId) ?? null
            : null
          optimistic.projects = project
            ? { id: project.id, name: project.name, color: project.color }
            : null
        }

        applyUpdatedEntry(queryClient, optimistic)
      }

      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        // Restores this entry only; other entries touched by concurrent mutations keep their state.
        applyUpdatedEntry(queryClient, context.previous)
      }

      void queryClient.invalidateQueries({ queryKey: TIME_ENTRIES_QUERY_KEY, predicate: isListQuery })
    },
    onSuccess: (updatedEntry) => {
      applyUpdatedEntry(queryClient, updatedEntry)
      revalidateInactiveEntryQueries()
    },
  })

  const deleteEntryMutation = useMutation<string, Error, string, MutationContext>({
    mutationFn: async (id) => {
      const { error } = await supabase.from('time_entries').delete().eq('id', id)

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to delete timer entry.'))
      }

      return id
    },
    onMutate: async (id) => {
      await cancelEntryLists(queryClient)

      const previous = getEntryFromCache(queryClient, id)

      updateEntryListCaches(
        queryClient,
        (cachedEntries) => cachedEntries.filter((entry) => entry.id !== id)
      )

      const cachedActiveEntry = queryClient.getQueryData<TimeEntry | null>(ACTIVE_ENTRY_QUERY_KEY)
      if (cachedActiveEntry?.id === id) {
        queryClient.setQueryData(ACTIVE_ENTRY_QUERY_KEY, null)
      }

      return { previous }
    },
    onError: (_error, _id, context) => {
      const previous = context?.previous
      if (previous) {
        applyCreatedEntry(queryClient, previous)
        // Only put the row back in the timer slot if that slot is (still) empty.
        if (previous.stopped_at === null && queryClient.getQueryData(ACTIVE_ENTRY_QUERY_KEY) == null) {
          queryClient.setQueryData(ACTIVE_ENTRY_QUERY_KEY, previous)
        }
      }

      void queryClient.invalidateQueries({ queryKey: TIME_ENTRIES_QUERY_KEY, predicate: isListQuery })
    },
    onSuccess: () => {
      // The entry was already removed from every list cache in onMutate.
      revalidateInactiveEntryQueries()
    },
  })

  const { mutateAsync: createEntryAsync } = createEntryMutation
  const { mutateAsync: stopEntryAsync } = stopEntryMutation
  const { mutateAsync: updateEntryAsync } = updateEntryMutation
  const { mutateAsync: deleteEntryAsync } = deleteEntryMutation

  const createEntry = useCallback(
    (input: CreateEntryInput) => createEntryAsync(input),
    [createEntryAsync]
  )
  const stopEntry = useCallback(
    (id: string, stopped_at: string, startedAt?: string) =>
      stopEntryAsync({ id, stopped_at, started_at: startedAt }),
    [stopEntryAsync]
  )
  const updateEntry = useCallback(
    (id: string, updates: TimeEntryUpdate) => updateEntryAsync({ id, updates }),
    [updateEntryAsync]
  )
  const deleteEntry = useCallback((id: string) => deleteEntryAsync(id), [deleteEntryAsync])

  return {
    createEntry,
    stopEntry,
    updateEntry,
    deleteEntry,
  }
}
