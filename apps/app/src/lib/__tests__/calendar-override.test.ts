import { describe, expect, it } from 'vitest'
import { applyEntryOverride, entriesReflectOverride, type EntryOverride } from '../calendar'
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

const override: EntryOverride = {
  entryId: 'entry-1',
  startedAt: new Date(2026, 6, 29, 11, 0, 0).toISOString(),
  stoppedAt: new Date(2026, 6, 29, 12, 30, 0).toISOString(),
  durationSeconds: 5400,
}

describe('applyEntryOverride', () => {
  it('returns the same array reference when there is no override', () => {
    const entries = [makeEntry()]
    expect(applyEntryOverride(entries, null)).toBe(entries)
  })

  it('replaces only the matching entry times', () => {
    const untouched = makeEntry({ id: 'entry-2', duration_seconds: 1200 })
    const result = applyEntryOverride([makeEntry(), untouched], override)

    expect(result[0]).toEqual({
      ...makeEntry(),
      started_at: override.startedAt,
      stopped_at: override.stoppedAt,
      duration_seconds: override.durationSeconds,
    })
    expect(result[1]).toBe(untouched)
  })
})

describe('entriesReflectOverride', () => {
  it('matches equal instants written in different ISO formats', () => {
    const entries = [
      makeEntry({ started_at: '2026-07-29T11:00:00.000Z', stopped_at: '2026-07-29T12:30:00.000Z' }),
    ]
    const localOverride: EntryOverride = {
      entryId: 'entry-1',
      startedAt: '2026-07-29T11:00:00+00:00',
      stoppedAt: '2026-07-29T12:30:00+00:00',
      durationSeconds: 5400,
    }

    expect(entriesReflectOverride(entries, localOverride)).toBe(true)
  })

  it('is false when the stop time differs', () => {
    const entries = [
      makeEntry({ started_at: override.startedAt, stopped_at: '2026-07-29T12:31:00.000Z' }),
    ]

    expect(entriesReflectOverride(entries, override)).toBe(false)
  })

  it('is false while the entry is still running', () => {
    const entries = [makeEntry({ started_at: override.startedAt, stopped_at: null })]

    expect(entriesReflectOverride(entries, override)).toBe(false)
  })
})
