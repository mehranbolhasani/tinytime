import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createEntryMock, updateEntryMock, deleteEntryMock, isTouchMock } = vi.hoisted(() => ({
  createEntryMock: vi.fn(),
  updateEntryMock: vi.fn(),
  deleteEntryMock: vi.fn(),
  isTouchMock: vi.fn(() => false),
}))

vi.mock('@/hooks/useTimeEntries', () => ({
  useTimeEntryMutations: () => ({
    createEntry: createEntryMock,
    updateEntry: updateEntryMock,
    deleteEntry: deleteEntryMock,
  }),
}))

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: () => isTouchMock(),
}))

import { useEntryActions } from '../useEntryActions.js'

function makeEntry(overrides = {}) {
  return {
    id: 'entry-1',
    started_at: '2024-01-15T09:00:00.000Z',
    stopped_at: '2024-01-15T10:00:00.000Z',
    duration_seconds: 3600,
    description: 'Deep work',
    project_id: null,
    projects: null,
    ...overrides,
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

function renderActions(entries = []) {
  return renderHook(() => useEntryActions({ entries }))
}

describe('useEntryActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isTouchMock.mockReturnValue(false)
  })

  it('opens the sheet for a stopped entry on touch viewports', () => {
    isTouchMock.mockReturnValue(true)
    const entry = makeEntry()
    const { result } = renderActions([entry])

    act(() => {
      result.current.openEntry(entry)
    })

    expect(result.current.sheetEntry).toEqual(entry)
    expect(result.current.editingEntry).toBeNull()
  })

  it('opens edit for a running entry on touch viewports', () => {
    isTouchMock.mockReturnValue(true)
    const entry = makeEntry({ stopped_at: null, duration_seconds: null })
    const { result } = renderActions([entry])

    act(() => {
      result.current.openEntry(entry)
    })

    expect(result.current.editingEntry).toEqual(entry)
    expect(result.current.sheetEntry).toBeNull()
  })

  it('clears entryToDelete on a successful delete', async () => {
    const entry = makeEntry()
    deleteEntryMock.mockResolvedValue(entry.id)
    const { result } = renderActions([entry])

    act(() => {
      result.current.requestDelete(entry)
    })

    await act(async () => {
      await result.current.confirmDelete()
    })

    expect(deleteEntryMock).toHaveBeenCalledWith(entry.id)
    expect(result.current.entryToDelete).toBeNull()
    expect(result.current.error).toBe('')
  })

  it('keeps entryToDelete and sets the error when a delete fails', async () => {
    const entry = makeEntry()
    deleteEntryMock.mockRejectedValue(new Error('nope'))
    const { result } = renderActions([entry])

    act(() => {
      result.current.requestDelete(entry)
    })

    await act(async () => {
      await result.current.confirmDelete()
    })

    expect(result.current.entryToDelete).toEqual(entry)
    expect(result.current.error).toBe('nope')
  })

  it('deletes only once when confirmDelete is called twice while pending', async () => {
    const entry = makeEntry()
    const gate = createDeferred()
    deleteEntryMock.mockReturnValue(gate.promise)
    const { result } = renderActions([entry])

    act(() => {
      result.current.requestDelete(entry)
    })

    let first
    let second
    act(() => {
      first = result.current.confirmDelete()
      second = result.current.confirmDelete()
    })

    gate.resolve(entry.id)
    await act(async () => {
      await first
      await second
    })

    expect(deleteEntryMock).toHaveBeenCalledTimes(1)
  })

  it('rethrows when duplicate fails', async () => {
    createEntryMock.mockRejectedValue(new Error('boom'))
    const entry = makeEntry()
    const { result } = renderActions([entry])

    let thrown
    await act(async () => {
      try {
        await result.current.duplicate(entry)
      } catch (duplicateError) {
        thrown = duplicateError
      }
    })

    expect(thrown?.message).toBe('boom')
    expect(result.current.error).toBe('')
  })

  it('reports the error when duplicateAndReport fails', async () => {
    createEntryMock.mockRejectedValue(new Error('boom'))
    const entry = makeEntry()
    const { result } = renderActions([entry])

    await act(async () => {
      await result.current.duplicateAndReport(entry)
    })

    expect(result.current.error).toBe('boom')
  })

  it('duplicates with the shared duplicate input', async () => {
    createEntryMock.mockResolvedValue(makeEntry({ id: 'copy' }))
    const entry = makeEntry()
    const { result } = renderActions([entry])

    await act(async () => {
      await result.current.duplicate(entry)
    })

    expect(createEntryMock).toHaveBeenCalledWith({
      project_id: entry.project_id,
      description: entry.description,
      started_at: entry.started_at,
      stopped_at: entry.stopped_at,
      duration_seconds: 3600,
    })
  })
})
