import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePendingEntryOverride } from '../usePendingEntryOverride'
import type { EntryOverride } from '@/lib/calendar'
import type { TimeEntry } from '@/types'

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'entry-1',
    started_at: '2026-07-29T09:00:00.000Z',
    stopped_at: '2026-07-29T10:00:00.000Z',
    duration_seconds: 3600,
    description: 'Work',
    project_id: null,
    projects: null,
    ...overrides,
  }
}

const override: EntryOverride = {
  entryId: 'entry-1',
  startedAt: '2026-07-29T11:00:00.000Z',
  stoppedAt: '2026-07-29T12:30:00.000Z',
  durationSeconds: 5400,
}

describe('usePendingEntryOverride', () => {
  it('draws the committed time until the cache contains it, then drops the override', () => {
    const { result, rerender } = renderHook(
      ({ entries }: { entries: TimeEntry[] }) => usePendingEntryOverride(entries),
      { initialProps: { entries: [makeEntry()] } }
    )

    act(() => result.current.setOverride(override))

    expect(result.current.override).toEqual(override)
    expect(result.current.entriesForRendering[0].started_at).toBe(override.startedAt)

    // An unrelated cache write keeps the pending look in place.
    rerender({ entries: [makeEntry({ description: 'Renamed elsewhere' })] })
    expect(result.current.override).toEqual(override)
    expect(result.current.entriesForRendering[0].started_at).toBe(override.startedAt)

    // The cache write carrying the new times retires it.
    rerender({
      entries: [
        makeEntry({
          started_at: override.startedAt,
          stopped_at: override.stoppedAt,
          duration_seconds: override.durationSeconds,
        }),
      ],
    })

    expect(result.current.override).toBeNull()
    expect(result.current.entriesForRendering[0].started_at).toBe(override.startedAt)
  })

  it('clearOverride puts the entry back at its cached time', () => {
    const { result } = renderHook(() => usePendingEntryOverride([makeEntry()]))

    act(() => result.current.setOverride(override))
    expect(result.current.entriesForRendering[0].started_at).toBe(override.startedAt)

    act(() => result.current.clearOverride())
    expect(result.current.entriesForRendering[0].started_at).toBe('2026-07-29T09:00:00.000Z')
  })
})
