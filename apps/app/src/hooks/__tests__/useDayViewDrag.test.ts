import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDayViewDrag } from '../useDayViewDrag'
import type { TimeEntry } from '@/types'

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'entry-1',
    started_at: new Date(2026, 6, 29, 9, 0, 0).toISOString(),
    stopped_at: new Date(2026, 6, 29, 10, 0, 0).toISOString(),
    duration_seconds: 3600,
    description: 'Work',
    project_id: null,
    projects: null,
    ...overrides,
  }
}

function pointerEvent(clientY: number): React.PointerEvent<HTMLDivElement> {
  const currentTarget = {
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 400,
      height: 768,
      right: 400,
      bottom: 768,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  }

  return {
    pointerType: 'mouse',
    button: 0,
    pointerId: 1,
    clientY,
    target: document.body,
    currentTarget,
    preventDefault: vi.fn(),
  } as unknown as React.PointerEvent<HTMLDivElement>
}

function makeOptions(dayStart: Date, overrides: Record<string, unknown> = {}) {
  return {
    entries: [] as TimeEntry[],
    dayStart,
    hourHeight: 32,
    minEntryHeight: 20,
    updateEntry: vi.fn(),
    createEntry: vi.fn(),
    onCreated: vi.fn(),
    onError: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  }
}

describe('useDayViewDrag — pending create across day changes', () => {
  it('drops the pending preview and unblocks dragging when the day changes', async () => {
    const dayStart = new Date(2026, 6, 29)
    const nextDayStart = new Date(2026, 6, 30)
    const created = makeEntry({ id: 'created-1', started_at: new Date(2026, 6, 29, 9, 0, 0).toISOString() })
    const createEntry = vi.fn().mockResolvedValue(created)

    const { result, rerender } = renderHook(
      ({ dayStart: currentDay }: { dayStart: Date }) =>
        useDayViewDrag(makeOptions(currentDay, { createEntry })),
      { initialProps: { dayStart } }
    )

    act(() => {
      result.current.gridHandlers.onPointerDown(pointerEvent(100))
    })
    expect(result.current.previewBlock?.variant).toBe('create')

    await act(async () => {
      await result.current.gridHandlers.onPointerUp(pointerEvent(200))
    })

    // The row is not in this day's entries yet, so the preview stays up.
    const pendingPreview = result.current.previewBlock
    expect(pendingPreview?.variant).toBe('create')

    // …and new drags are blocked while we wait for it.
    act(() => {
      result.current.gridHandlers.onPointerDown(pointerEvent(300))
    })
    expect(result.current.previewBlock).toBe(pendingPreview)

    rerender({ dayStart: nextDayStart })

    expect(result.current.previewBlock).toBeNull()

    act(() => {
      result.current.gridHandlers.onPointerDown(pointerEvent(400))
    })
    expect(result.current.previewBlock).not.toBeNull()
    expect(result.current.previewBlock?.variant).toBe('create')
  })
})
