import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createEntryMock, stopEntryMock } = vi.hoisted(() => ({
  createEntryMock: vi.fn(),
  stopEntryMock: vi.fn(),
}))

vi.mock('@/hooks/useTimeEntries', () => ({
  ACTIVE_ENTRY_QUERY_KEY: ['time_entries', 'active'],
  useTimeEntryMutations: () => ({
    createEntry: createEntryMock,
    stopEntry: stopEntryMock,
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
  }),
}))

import { useTimerControlActions } from '../useTimerControlActions.js'

const ACTIVE_KEY = ['time_entries', 'active']

function makeEntry(overrides = {}) {
  return {
    id: 'entry-1',
    started_at: '2024-01-15T09:00:00.000Z',
    stopped_at: null,
    duration_seconds: null,
    description: null,
    project_id: null,
    projects: null,
    ...overrides,
  }
}

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

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function renderActions(queryClient) {
  return renderHook(() => useTimerControlActions(), { wrapper: makeWrapper(queryClient) })
}

describe('useTimerControlActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('puts an optimistic entry into the active cache before createEntry resolves', async () => {
    const queryClient = makeQueryClient()
    const gate = createDeferred()
    createEntryMock.mockReturnValue(gate.promise)

    const { result } = renderActions(queryClient)
    let startPromise
    act(() => {
      startPromise = result.current.startTimer({ description: '  writing  ' })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData(ACTIVE_KEY)
      expect(cached?.id.startsWith('optimistic-')).toBe(true)
      expect(cached?.description).toBe('writing')
      expect(cached?.stopped_at).toBeNull()
    })

    gate.resolve(makeEntry({ id: 'real-1' }))
    await act(async () => {
      await startPromise
    })
  })

  it('restores the previous active entry and sets an error when createEntry rejects', async () => {
    const queryClient = makeQueryClient()
    const previous = makeEntry({ id: 'previous' })
    queryClient.setQueryData(ACTIVE_KEY, previous)

    const gate = createDeferred()
    stopEntryMock.mockResolvedValue({ ...previous, stopped_at: '2024-01-15T10:00:00.000Z' })
    createEntryMock.mockReturnValue(gate.promise)

    const { result } = renderActions(queryClient)
    let startPromise
    act(() => {
      startPromise = result.current.startTimer()
    })

    await waitFor(() => {
      expect(queryClient.getQueryData(ACTIVE_KEY)?.id.startsWith('optimistic-')).toBe(true)
    })

    gate.reject(new Error('boom'))
    await act(async () => {
      await startPromise
    })

    expect(queryClient.getQueryData(ACTIVE_KEY)).toEqual(previous)
    expect(result.current.error).toBe('boom')
  })

  it('stops the previous entry at the same timestamp the new one starts', async () => {
    const queryClient = makeQueryClient()
    const previous = makeEntry({ id: 'previous', started_at: '2024-01-15T08:00:00.000Z' })
    queryClient.setQueryData(ACTIVE_KEY, previous)

    stopEntryMock.mockResolvedValue({ ...previous, stopped_at: '2024-01-15T09:00:00.000Z' })
    createEntryMock.mockResolvedValue(makeEntry({ id: 'real-2' }))

    const { result } = renderActions(queryClient)

    await act(async () => {
      await result.current.startTimer({ projectId: 'project-1', description: 'deep work' })
    })

    const createArgs = createEntryMock.mock.calls[0][0]
    const startedAt = createArgs.started_at

    expect(stopEntryMock).toHaveBeenCalledWith(previous.id, startedAt, previous.started_at)
    expect(createArgs).toMatchObject({
      project_id: 'project-1',
      description: 'deep work',
      started_at: startedAt,
    })
  })

  it('clears the active cache before stopEntry resolves and restores it on failure', async () => {
    const queryClient = makeQueryClient()
    const current = makeEntry({ id: 'current' })
    queryClient.setQueryData(ACTIVE_KEY, current)

    const gate = createDeferred()
    stopEntryMock.mockReturnValue(gate.promise)

    const { result } = renderActions(queryClient)
    let stopPromise
    act(() => {
      stopPromise = result.current.stopTimer()
    })

    await waitFor(() => {
      expect(queryClient.getQueryData(ACTIVE_KEY)).toBeNull()
    })

    gate.reject(new Error('nope'))
    await act(async () => {
      await stopPromise
    })

    expect(queryClient.getQueryData(ACTIVE_KEY)).toEqual(current)
    expect(result.current.error).toBe('nope')
  })

  it('passes an explicit stoppedAt through to stopEntry', async () => {
    const queryClient = makeQueryClient()
    const current = makeEntry({ id: 'current' })
    queryClient.setQueryData(ACTIVE_KEY, current)
    stopEntryMock.mockResolvedValue({ ...current, stopped_at: '2024-01-15T09:30:00.000Z' })

    const { result } = renderActions(queryClient)
    const stoppedAt = '2024-01-15T09:30:00.000Z'

    await act(async () => {
      await result.current.stopTimer({ stoppedAt })
    })

    expect(stopEntryMock).toHaveBeenCalledWith(current.id, stoppedAt, current.started_at)
  })

  it('is a no-op while the cached entry is optimistic', async () => {
    const queryClient = makeQueryClient()
    const optimistic = makeEntry({ id: 'optimistic-123' })
    queryClient.setQueryData(ACTIVE_KEY, optimistic)
    stopEntryMock.mockResolvedValue({ ...optimistic, stopped_at: '2024-01-15T09:30:00.000Z' })

    const { result } = renderActions(queryClient)

    await act(async () => {
      await result.current.stopTimer()
    })

    expect(stopEntryMock).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(ACTIVE_KEY)).toEqual(optimistic)
  })
})
