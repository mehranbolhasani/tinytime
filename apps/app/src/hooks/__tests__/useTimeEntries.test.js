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

  it('leaves the active cache untouched when the created entry is already stopped', async () => {
    const activeEntry = makeEntry({ id: 'still-running', stopped_at: null })
    queryClient.setQueryData(QUERY_KEY_ACTIVE, activeEntry)
    const stoppedEntry = makeEntry({ id: 'new-2' })
    mockClient = createMockSupabaseClient({ data: stoppedEntry, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.createEntry({ started_at: stoppedEntry.started_at })
    })

    expect(queryClient.getQueryData(QUERY_KEY_ACTIVE)).toEqual(activeEntry)
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

  it('clears the active cache entry when stopping the active entry', async () => {
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

  it('leaves a different active entry in place when stopping another entry', async () => {
    const activeEntry = makeEntry({ id: 'other-active', stopped_at: null })
    queryClient.setQueryData(QUERY_KEY_ACTIVE, activeEntry)

    const runningEntry = makeEntry({ id: 'run-other', stopped_at: null })
    const stoppedEntry = { ...runningEntry, stopped_at: '2024-01-15T10:00:00.000Z', duration_seconds: 3600 }
    mockClient = createMockSupabaseClient({ data: stoppedEntry, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations({ entries: [runningEntry] }),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.stopEntry('run-other', stoppedEntry.stopped_at)
    })

    expect(queryClient.getQueryData(QUERY_KEY_ACTIVE)).toEqual(activeEntry)
  })

  it('only updates entries that are still running', async () => {
    const runningEntry = makeEntry({ id: 'run-guard', stopped_at: null })
    const stoppedEntry = { ...runningEntry, stopped_at: '2024-01-15T10:00:00.000Z', duration_seconds: 3600 }
    mockClient = createMockSupabaseClient({ data: stoppedEntry, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations({ entries: [runningEntry] }),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.stopEntry('run-guard', stoppedEntry.stopped_at)
    })

    expect(mockClient._chain.is).toHaveBeenCalledWith('stopped_at', null)
  })

  it('keeps the existing stop time when the entry was already stopped elsewhere', async () => {
    const alreadyStopped = makeEntry({
      id: 'run-already',
      stopped_at: '2024-01-15T09:30:00.000Z',
      duration_seconds: 1800,
    })
    mockClient = createMockSupabaseClient({ data: null, error: null })
    mockClient._chain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: alreadyStopped, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    let stoppedEntry
    await act(async () => {
      stoppedEntry = await result.current.stopEntry(
        'run-already',
        '2024-01-15T10:00:00.000Z',
        alreadyStopped.started_at
      )
    })

    expect(stoppedEntry).toEqual(alreadyStopped)
    expect(stoppedEntry.stopped_at).toBe('2024-01-15T09:30:00.000Z')
  })

  it('rejects when the entry was deleted before the stop landed', async () => {
    mockClient = createMockSupabaseClient({ data: null, error: null })

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await expect(
        result.current.stopEntry(
          'run-deleted',
          '2024-01-15T10:00:00.000Z',
          '2024-01-15T09:00:00.000Z'
        )
      ).rejects.toThrow('This timer entry no longer exists.')
    })
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
// updateEntry — payload tests
// ---------------------------------------------------------------------------

describe('updateEntry payload', () => {
  let queryClient

  beforeEach(() => {
    queryClient = makeQueryClient()
    mockClient = createMockSupabaseClient({ data: makeEntry({ id: 'payload-entry' }), error: null })
  })

  async function runUpdate(updates) {
    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.updateEntry('payload-entry', updates)
    })

    return mockClient._chain.update.mock.calls[0][0]
  }

  it('omits project_id and description for a times-only update', async () => {
    const payload = await runUpdate({
      started_at: '2024-01-15T09:00:00.000Z',
      stopped_at: '2024-01-15T10:00:00.000Z',
      duration_seconds: 3600,
    })

    expect(payload).not.toHaveProperty('project_id')
    expect(payload).not.toHaveProperty('description')
  })

  it('trims a description-only update', async () => {
    const payload = await runUpdate({ description: '  hello  ' })

    expect(payload).toEqual({ description: 'hello' })
  })

  it('stores null for a whitespace-only description', async () => {
    const payload = await runUpdate({ description: '   ' })

    expect(payload.description).toBeNull()
  })

  it('keeps an explicit null project_id', async () => {
    const payload = await runUpdate({ project_id: null })

    expect(payload).toEqual({ project_id: null })
  })
})

// ---------------------------------------------------------------------------
// optimistic update / delete
// ---------------------------------------------------------------------------

function deferred() {
  let resolve
  const promise = new Promise((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function deferDelete() {
  const reply = deferred()
  mockClient = createMockSupabaseClient()
  mockClient._chain.then = (onFulfilled, onRejected) =>
    reply.promise.then(onFulfilled, onRejected)
  return reply
}

describe('useTimeEntryMutations — optimistic update', () => {
  let queryClient

  beforeEach(() => {
    queryClient = makeQueryClient()
    queryClient.setQueryData(QUERY_KEY_LIST, [makeEntry({ id: 'e1' })])
    queryClient.setQueryData(QUERY_KEY_ACTIVE, null)
  })

  it('shows the new times in the list cache before the request resolves', async () => {
    const reply = deferred()
    mockClient = createMockSupabaseClient()
    mockClient._chain.single.mockReturnValue(reply.promise)

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    let pending
    await act(async () => {
      pending = result.current.updateEntry('e1', {
        started_at: '2024-01-15T09:30:00.000Z',
        stopped_at: '2024-01-15T10:30:00.000Z',
        duration_seconds: 3600,
      })
    })

    const optimistic = queryClient.getQueryData(QUERY_KEY_LIST)
    expect(optimistic).toHaveLength(1)
    expect(optimistic[0].started_at).toBe('2024-01-15T09:30:00.000Z')
    expect(optimistic[0].stopped_at).toBe('2024-01-15T10:30:00.000Z')

    await act(async () => {
      reply.resolve({
        data: makeEntry({
          id: 'e1',
          started_at: '2024-01-15T09:30:00.000Z',
          stopped_at: '2024-01-15T10:30:00.000Z',
        }),
        error: null,
      })
      await pending
    })

    expect(queryClient.getQueryData(QUERY_KEY_LIST)[0].started_at).toBe('2024-01-15T09:30:00.000Z')
  })

  it('normalises the description in the optimistic entry', async () => {
    const reply = deferred()
    mockClient = createMockSupabaseClient()
    mockClient._chain.single.mockReturnValue(reply.promise)

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    let pending
    await act(async () => {
      pending = result.current.updateEntry('e1', { description: '   ' })
    })

    expect(queryClient.getQueryData(QUERY_KEY_LIST)[0].description).toBeNull()

    await act(async () => {
      reply.resolve({ data: makeEntry({ id: 'e1', description: null }), error: null })
      await pending
    })
  })

  it('restores the previous lists and active entry when the update fails', async () => {
    const reply = deferred()
    const activeEntry = makeEntry({ id: 'active-opt', stopped_at: null })
    queryClient.setQueryData(QUERY_KEY_ACTIVE, activeEntry)
    mockClient = createMockSupabaseClient()
    mockClient._chain.single.mockReturnValue(reply.promise)

    const before = queryClient.getQueryData(QUERY_KEY_LIST)

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    let pending
    await act(async () => {
      pending = result.current.updateEntry('e1', { description: 'Optimistic' })
    })

    expect(queryClient.getQueryData(QUERY_KEY_LIST)[0].description).toBe('Optimistic')

    await act(async () => {
      reply.resolve({ data: null, error: { message: 'nope' } })
      await expect(pending).rejects.toThrow('Unable to update timer entry.')
    })

    expect(queryClient.getQueryData(QUERY_KEY_LIST)).toEqual(before)
    expect(queryClient.getQueryData(QUERY_KEY_ACTIVE)).toEqual(activeEntry)
  })
})

describe('useTimeEntryMutations — optimistic delete', () => {
  let queryClient

  beforeEach(() => {
    queryClient = makeQueryClient()
    queryClient.setQueryData(QUERY_KEY_LIST, [makeEntry({ id: 'd1' }), makeEntry({ id: 'd2' })])
    queryClient.setQueryData(QUERY_KEY_ACTIVE, null)
  })

  function deferDelete() {
    const reply = deferred()
    mockClient = createMockSupabaseClient()
    mockClient._chain.then = (onFulfilled, onRejected) =>
      reply.promise.then(onFulfilled, onRejected)
    return reply
  }

  it('removes the entry from the list cache before the request resolves', async () => {
    const reply = deferDelete()

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    let pending
    await act(async () => {
      pending = result.current.deleteEntry('d1')
    })

    const optimistic = queryClient.getQueryData(QUERY_KEY_LIST)
    expect(optimistic.map((entry) => entry.id)).toEqual(['d2'])

    await act(async () => {
      reply.resolve({ data: null, error: null })
      await pending
    })

    expect(queryClient.getQueryData(QUERY_KEY_LIST).map((entry) => entry.id)).toEqual(['d2'])
  })

  it('restores the deleted entry when the request fails', async () => {
    const reply = deferDelete()

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    let pending
    await act(async () => {
      pending = result.current.deleteEntry('d1')
    })

    expect(queryClient.getQueryData(QUERY_KEY_LIST)).toHaveLength(1)

    await act(async () => {
      reply.resolve({ data: null, error: { message: 'offline' } })
      await expect(pending).rejects.toThrow('Unable to delete timer entry.')
    })

    const restored = queryClient.getQueryData(QUERY_KEY_LIST)
    expect(restored.map((entry) => entry.id).sort()).toEqual(['d1', 'd2'])
    expect(restored.find((entry) => entry.id === 'd1').started_at).toBe(
      makeEntry({ id: 'd1' }).started_at
    )
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

  it('restores the entry only in caches whose range contains it', async () => {
    queryClient.setQueryData(QUERY_KEY_OUTSIDE, [])
    const reply = deferDelete()

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    let pending
    await act(async () => {
      pending = result.current.deleteEntry('d1')
    })

    await act(async () => {
      reply.resolve({ data: null, error: { message: 'offline' } })
      await expect(pending).rejects.toThrow('Unable to delete timer entry.')
    })

    expect(queryClient.getQueryData(QUERY_KEY_LIST).map((entry) => entry.id).sort()).toEqual([
      'd1',
      'd2',
    ])
    expect(queryClient.getQueryData(QUERY_KEY_OUTSIDE)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// concurrent writes — rollback must not clobber other entries
// ---------------------------------------------------------------------------

describe('useTimeEntryMutations — concurrent rollback', () => {
  let queryClient

  const entryA = makeEntry({
    id: 'a',
    description: 'A',
    started_at: '2024-01-15T09:00:00.000Z',
    stopped_at: '2024-01-15T10:00:00.000Z',
  })
  const entryB = makeEntry({
    id: 'b',
    description: 'B',
    started_at: '2024-01-15T11:00:00.000Z',
    stopped_at: '2024-01-15T12:00:00.000Z',
  })

  beforeEach(() => {
    queryClient = makeQueryClient()
    queryClient.setQueryData(QUERY_KEY_LIST, [entryA, entryB])
    queryClient.setQueryData(QUERY_KEY_ACTIVE, null)
  })

  it('rolls back only the entry whose save failed', async () => {
    const replyA = deferred()
    const replyB = deferred()
    let lastPayload = null

    mockClient = createMockSupabaseClient()
    mockClient._chain.update.mockImplementation((payload) => {
      lastPayload = payload
      return mockClient._chain
    })
    mockClient._chain.single.mockImplementation(() =>
      lastPayload?.description === 'A moved' ? replyA.promise : replyB.promise
    )

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    let pendingA
    let pendingB
    await act(async () => {
      pendingA = result.current.updateEntry('a', {
        description: 'A moved',
        started_at: '2024-01-15T09:30:00.000Z',
        stopped_at: '2024-01-15T10:30:00.000Z',
        duration_seconds: 3600,
      })
      pendingB = result.current.updateEntry('b', {
        description: 'B moved',
        started_at: '2024-01-15T11:30:00.000Z',
        stopped_at: '2024-01-15T12:30:00.000Z',
        duration_seconds: 3600,
      })
    })

    await act(async () => {
      replyB.resolve({
        data: {
          ...entryB,
          description: 'B moved',
          started_at: '2024-01-15T11:30:00.000Z',
          stopped_at: '2024-01-15T12:30:00.000Z',
        },
        error: null,
      })
      await pendingB
    })

    await act(async () => {
      replyA.resolve({ data: null, error: { message: 'nope' } })
      await expect(pendingA).rejects.toThrow('Unable to update timer entry.')
    })

    const cached = queryClient.getQueryData(QUERY_KEY_LIST)
    const cachedA = cached.find((entry) => entry.id === 'a')
    const cachedB = cached.find((entry) => entry.id === 'b')

    expect(cachedA.description).toBe('A')
    expect(cachedA.started_at).toBe(entryA.started_at)
    expect(cachedB.description).toBe('B moved')
    expect(cachedB.started_at).toBe('2024-01-15T11:30:00.000Z')
  })
})

// ---------------------------------------------------------------------------
// rollback must leave the running timer alone
// ---------------------------------------------------------------------------

describe('useTimeEntryMutations — rollback and the timer', () => {
  let queryClient

  beforeEach(() => {
    queryClient = makeQueryClient()
    queryClient.setQueryData(QUERY_KEY_LIST, [makeEntry({ id: 'stopped-1' })])
  })

  it('does not overwrite the timer when an unrelated entry fails', async () => {
    const runningWhenStarted = makeEntry({ id: 'run-1', stopped_at: null, duration_seconds: null })
    const runningNow = makeEntry({ id: 'run-2', stopped_at: null, duration_seconds: null })
    queryClient.setQueryData(QUERY_KEY_ACTIVE, runningWhenStarted)

    const reply = deferred()
    mockClient = createMockSupabaseClient()
    mockClient._chain.single.mockReturnValue(reply.promise)

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    let pending
    await act(async () => {
      pending = result.current.updateEntry('stopped-1', { description: 'Renamed' })
    })

    // The timer starts/stops while the save is in flight.
    queryClient.setQueryData(QUERY_KEY_ACTIVE, runningNow)

    await act(async () => {
      reply.resolve({ data: null, error: { message: 'nope' } })
      await expect(pending).rejects.toThrow('Unable to update timer entry.')
    })

    expect(queryClient.getQueryData(QUERY_KEY_ACTIVE)).toEqual(runningNow)
    expect(queryClient.getQueryData(QUERY_KEY_LIST)[0].description).toBe('Test entry')
  })
})

// ---------------------------------------------------------------------------
// cancelling in-flight lists
// ---------------------------------------------------------------------------

describe('useTimeEntryMutations — cancel in-flight lists', () => {
  let queryClient

  beforeEach(() => {
    queryClient = makeQueryClient()
    queryClient.setQueryData(QUERY_KEY_LIST, [makeEntry({ id: 'e1' })])
    queryClient.setQueryData(QUERY_KEY_ACTIVE, null)
  })

  it('leaves a first load with no data fetching', async () => {
    const firstLoadKey = [
      'time_entries',
      { from: '2024-02-01T00:00:00.000Z', to: '2024-02-02T00:00:00.000Z' },
    ]

    await act(async () => {
      void queryClient.prefetchQuery({
        queryKey: firstLoadKey,
        queryFn: () => new Promise(() => {}),
      })
    })

    expect(queryClient.getQueryState(firstLoadKey).fetchStatus).toBe('fetching')

    const reply = deferred()
    mockClient = createMockSupabaseClient()
    mockClient._chain.single.mockReturnValue(reply.promise)

    const { result } = renderHook(
      () => useTimeEntryMutations(),
      { wrapper: makeWrapper(queryClient) }
    )

    let pending
    await act(async () => {
      pending = result.current.updateEntry('e1', { description: 'Renamed' })
    })

    expect(queryClient.getQueryState(firstLoadKey).fetchStatus).toBe('fetching')
    expect(queryClient.getQueryState(firstLoadKey).data).toBeUndefined()

    await act(async () => {
      reply.resolve({ data: makeEntry({ id: 'e1', description: 'Renamed' }), error: null })
      await pending
    })
  })
})
