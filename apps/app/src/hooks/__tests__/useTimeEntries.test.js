import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient } from '@/test/mocks/supabase.js'
import { useTimeEntryMutations } from '../useTimeEntries.js'

// ---------------------------------------------------------------------------
// Module mock — replaces assertSupabaseClient with a test-controlled client.
// The `mockClient` variable is updated per-test in beforeEach.
// ---------------------------------------------------------------------------

let mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase', () => ({
  assertSupabaseClient: () => mockClient,
  getFriendlySupabaseError: (_error, fallback) => fallback,
}))

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUERY_KEY_ACTIVE = ['time_entries', 'active']
const DAY_RANGE = { from: '2024-01-15T00:00:00.000Z', to: '2024-01-16T00:00:00.000Z' }
const QUERY_KEY_LIST = ['time_entries', DAY_RANGE]

const OUTSIDE_RANGE = { from: '2024-01-20T00:00:00.000Z', to: '2024-01-21T00:00:00.000Z' }
const QUERY_KEY_OUTSIDE = ['time_entries', OUTSIDE_RANGE]

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEntry(overrides = {}) {
  return {
    id: 'entry-1',
    started_at: '2024-01-15T09:00:00.000Z',
    stopped_at: '2024-01-15T10:00:00.000Z',
    duration_seconds: 3600,
    description: 'Test entry',
    projects: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function makeWrapper(queryClient) {
  return function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

// ---------------------------------------------------------------------------
// createEntry — cache update tests
// ---------------------------------------------------------------------------

describe('useTimeEntryMutations — createEntry', () => {
  let queryClient

  beforeEach(() => {
    queryClient = makeQueryClient()
    // Pre-populate the list cache with one existing entry
    queryClient.setQueryData(QUERY_KEY_LIST, [makeEntry({ id: 'existing' })])
    queryClient.setQueryData(QUERY_KEY_ACTIVE, null)
  })

  it('sets active cache to the new entry when it has no stopped_at (running)', async () => {
    const runningEntry = makeEntry({ id: 'new-1', stopped_at: null, duration_seconds: null })
    mockClient = createMockSupabaseClient({ data: runningEntry, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.createEntry({
        started_at: runningEntry.started_at,
        stopped_at: null,
      })
    })

    expect(queryClient.getQueryData(QUERY_KEY_ACTIVE)).toEqual(runningEntry)
  })

  it('sets active cache to null when the created entry is already stopped', async () => {
    const stoppedEntry = makeEntry({ id: 'new-2' })
    mockClient = createMockSupabaseClient({ data: stoppedEntry, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.createEntry({ started_at: stoppedEntry.started_at })
    })

    expect(queryClient.getQueryData(QUERY_KEY_ACTIVE)).toBeNull()
  })

  it('appends the new entry to the matching list cache, sorted by started_at', async () => {
    const laterEntry = makeEntry({
      id: 'later',
      started_at: '2024-01-15T11:00:00.000Z',
      stopped_at: '2024-01-15T12:00:00.000Z',
    })
    mockClient = createMockSupabaseClient({ data: laterEntry, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.createEntry({ started_at: laterEntry.started_at })
    })

    const cached = queryClient.getQueryData(QUERY_KEY_LIST)
    expect(cached).toHaveLength(2)
    expect(cached[1].id).toBe('later')
  })

  it('does not add the entry to a list cache whose range it falls outside', async () => {
    queryClient.setQueryData(QUERY_KEY_OUTSIDE, [])
    const entry = makeEntry({ id: 'in-range' })
    mockClient = createMockSupabaseClient({ data: entry, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.createEntry({ started_at: entry.started_at })
    })

    expect(queryClient.getQueryData(QUERY_KEY_OUTSIDE)).toHaveLength(0)
  })

  it('replaces an existing cache entry when createEntry returns a duplicate id', async () => {
    const updated = makeEntry({ id: 'existing', description: 'Updated' })
    mockClient = createMockSupabaseClient({ data: updated, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.createEntry({ started_at: updated.started_at })
    })

    const cached = queryClient.getQueryData(QUERY_KEY_LIST)
    expect(cached).toHaveLength(1)
    expect(cached[0].description).toBe('Updated')
  })
})

// ---------------------------------------------------------------------------
// stopEntry — cache update tests
// ---------------------------------------------------------------------------

describe('useTimeEntryMutations — stopEntry', () => {
  let queryClient

  beforeEach(() => {
    queryClient = makeQueryClient()
  })

  it('clears the active cache entry after stop', async () => {
    const runningEntry = makeEntry({ id: 'run-1', stopped_at: null, duration_seconds: null })
    queryClient.setQueryData(QUERY_KEY_ACTIVE, runningEntry)
    queryClient.setQueryData(QUERY_KEY_LIST, [runningEntry])

    const stoppedEntry = { ...runningEntry, stopped_at: '2024-01-15T10:00:00.000Z', duration_seconds: 3600 }
    mockClient = createMockSupabaseClient({ data: stoppedEntry, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations({ entries: [runningEntry] }),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.stopEntry('run-1', stoppedEntry.stopped_at)
    })

    expect(queryClient.getQueryData(QUERY_KEY_ACTIVE)).toBeNull()
  })

  it('updates the matching list cache entry with the stopped data', async () => {
    const runningEntry = makeEntry({ id: 'run-2', stopped_at: null })
    queryClient.setQueryData(QUERY_KEY_LIST, [runningEntry])

    const stoppedEntry = { ...runningEntry, stopped_at: '2024-01-15T10:00:00.000Z', duration_seconds: 3600 }
    mockClient = createMockSupabaseClient({ data: stoppedEntry, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations({ entries: [runningEntry] }),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.stopEntry('run-2', stoppedEntry.stopped_at)
    })

    const cached = queryClient.getQueryData(QUERY_KEY_LIST)
    expect(cached[0].stopped_at).toBe(stoppedEntry.stopped_at)
    expect(cached[0].duration_seconds).toBe(3600)
  })

  it('removes the entry from a list cache whose range it falls outside after stop', async () => {
    // Entry was started outside the outside-range, so after stop it no longer belongs there
    const runningEntry = makeEntry({ id: 'run-3', stopped_at: null })
    queryClient.setQueryData(QUERY_KEY_OUTSIDE, [runningEntry])

    // stoppedEntry.started_at is in DAY_RANGE, not OUTSIDE_RANGE
    const stoppedEntry = { ...runningEntry, stopped_at: '2024-01-15T10:00:00.000Z', duration_seconds: 3600 }
    mockClient = createMockSupabaseClient({ data: stoppedEntry, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations({ entries: [runningEntry] }),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.stopEntry('run-3', stoppedEntry.stopped_at)
    })

    // stoppedEntry.started_at ('2024-01-15') is outside OUTSIDE_RANGE ('2024-01-20'),
    // so the updater should filter it out
    const cached = queryClient.getQueryData(QUERY_KEY_OUTSIDE)
    expect(cached).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// updateEntry — cache update tests
// ---------------------------------------------------------------------------

describe('useTimeEntryMutations — updateEntry', () => {
  let queryClient

  beforeEach(() => {
    queryClient = makeQueryClient()
    queryClient.setQueryData(QUERY_KEY_LIST, [makeEntry({ id: 'e1' })])
    queryClient.setQueryData(QUERY_KEY_ACTIVE, null)
  })

  it('replaces the matching entry in the list cache', async () => {
    const updated = makeEntry({ id: 'e1', description: 'Updated description' })
    mockClient = createMockSupabaseClient({ data: updated, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.updateEntry('e1', { description: 'Updated description' })
    })

    const cached = queryClient.getQueryData(QUERY_KEY_LIST)
    expect(cached[0].description).toBe('Updated description')
  })

  it('removes the entry from a list cache when the updated entry falls outside its range', async () => {
    // Pre-populate the outside-range cache with the entry
    queryClient.setQueryData(QUERY_KEY_OUTSIDE, [makeEntry({ id: 'e1' })])

    // The updated entry is still started on 2024-01-15, which is outside OUTSIDE_RANGE
    const updated = makeEntry({ id: 'e1', description: 'Moved' })
    mockClient = createMockSupabaseClient({ data: updated, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.updateEntry('e1', { description: 'Moved' })
    })

    const cached = queryClient.getQueryData(QUERY_KEY_OUTSIDE)
    expect(cached).toHaveLength(0)
  })

  it('updates the active cache when the updated entry was the active one', async () => {
    const activeEntry = makeEntry({ id: 'active-1', stopped_at: null })
    queryClient.setQueryData(QUERY_KEY_ACTIVE, activeEntry)

    const updated = { ...activeEntry, description: 'Still active', stopped_at: null }
    mockClient = createMockSupabaseClient({ data: updated, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.updateEntry('active-1', { description: 'Still active' })
    })

    const cachedActive = queryClient.getQueryData(QUERY_KEY_ACTIVE)
    expect(cachedActive?.description).toBe('Still active')
  })

  it('sets active cache to null when the updated entry gets a stopped_at', async () => {
    const activeEntry = makeEntry({ id: 'active-2', stopped_at: null })
    queryClient.setQueryData(QUERY_KEY_ACTIVE, activeEntry)

    const updated = { ...activeEntry, stopped_at: '2024-01-15T10:00:00.000Z' }
    mockClient = createMockSupabaseClient({ data: updated, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.updateEntry('active-2', { stopped_at: updated.stopped_at })
    })

    expect(queryClient.getQueryData(QUERY_KEY_ACTIVE)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// deleteEntry — cache update tests
// ---------------------------------------------------------------------------

describe('useTimeEntryMutations — deleteEntry', () => {
  let queryClient

  beforeEach(() => {
    queryClient = makeQueryClient()
    queryClient.setQueryData(QUERY_KEY_LIST, [makeEntry({ id: 'd1' }), makeEntry({ id: 'd2' })])
    queryClient.setQueryData(QUERY_KEY_ACTIVE, null)
    mockClient = createMockSupabaseClient({ error: null })
  })

  it('removes the deleted entry from the list cache', async () => {
    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.deleteEntry('d1')
    })

    const cached = queryClient.getQueryData(QUERY_KEY_LIST)
    expect(cached).toHaveLength(1)
    expect(cached[0].id).toBe('d2')
  })

  it('clears the active cache when the deleted entry was the active one', async () => {
    const activeEntry = makeEntry({ id: 'active-del', stopped_at: null })
    queryClient.setQueryData(QUERY_KEY_ACTIVE, activeEntry)

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.deleteEntry('active-del')
    })

    expect(queryClient.getQueryData(QUERY_KEY_ACTIVE)).toBeNull()
  })

  it('leaves the active cache untouched when a different entry is deleted', async () => {
    const activeEntry = makeEntry({ id: 'keep-active', stopped_at: null })
    queryClient.setQueryData(QUERY_KEY_ACTIVE, activeEntry)

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.deleteEntry('d1')
    })

    expect(queryClient.getQueryData(QUERY_KEY_ACTIVE)?.id).toBe('keep-active')
  })
})
