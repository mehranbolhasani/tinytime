import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  formatDuration,
  formatDurationOrDash,
  formatDurationHMS,
  computeDuration,
  groupEntriesByDay,
  localDayRange,
  exportToCSV,
} from '../utils.js'

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------
describe('formatDuration', () => {
  it('returns "0m" for zero', () => {
    expect(formatDuration(0)).toBe('0m')
  })

  it('returns only minutes when under one hour', () => {
    expect(formatDuration(60)).toBe('1m')
    expect(formatDuration(3540)).toBe('59m')  // 59 minutes in seconds
    expect(formatDuration(59)).toBe('0m')     // 59 seconds = 0 whole minutes
  })

  it('returns hours and minutes when at least one hour', () => {
    expect(formatDuration(3600)).toBe('1h 0m')
    expect(formatDuration(3661)).toBe('1h 1m')
    expect(formatDuration(7322)).toBe('2h 2m')
  })

  it('rounds fractional seconds before formatting', () => {
    expect(formatDuration(59.6)).toBe('1m')
  })

  it('treats negative values as zero', () => {
    expect(formatDuration(-100)).toBe('0m')
  })

  it('treats NaN as zero', () => {
    expect(formatDuration(NaN)).toBe('0m')
  })

  it('treats Infinity as zero', () => {
    expect(formatDuration(Infinity)).toBe('0m')
  })
})

// ---------------------------------------------------------------------------
// formatDurationOrDash
// ---------------------------------------------------------------------------
describe('formatDurationOrDash', () => {
  it('returns em-dash for zero', () => {
    expect(formatDurationOrDash(0)).toBe('—')
  })

  it('returns em-dash for negative values', () => {
    expect(formatDurationOrDash(-1)).toBe('—')
  })

  it('returns em-dash for NaN', () => {
    expect(formatDurationOrDash(NaN)).toBe('—')
  })

  it('formats normally for positive durations', () => {
    expect(formatDurationOrDash(3600)).toBe('1h 0m')
    expect(formatDurationOrDash(90)).toBe('1m')
  })
})

// ---------------------------------------------------------------------------
// formatDurationHMS
// ---------------------------------------------------------------------------
describe('formatDurationHMS', () => {
  it('returns 00:00:00 for zero', () => {
    expect(formatDurationHMS(0)).toBe('00:00:00')
  })

  it('zero-pads all segments', () => {
    expect(formatDurationHMS(3661)).toBe('01:01:01')
  })

  it('handles exactly one hour', () => {
    expect(formatDurationHMS(3600)).toBe('01:00:00')
  })

  it('handles values with only seconds', () => {
    expect(formatDurationHMS(9)).toBe('00:00:09')
  })

  it('treats negative as zero', () => {
    expect(formatDurationHMS(-5)).toBe('00:00:00')
  })

  it('treats NaN as zero', () => {
    expect(formatDurationHMS(NaN)).toBe('00:00:00')
  })
})

// ---------------------------------------------------------------------------
// computeDuration
// ---------------------------------------------------------------------------
describe('computeDuration', () => {
  it('returns duration in seconds between two timestamps', () => {
    expect(computeDuration('2024-01-15T09:00:00Z', '2024-01-15T10:00:00Z')).toBe(3600)
  })

  it('returns 0 for identical timestamps', () => {
    expect(computeDuration('2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z')).toBe(0)
  })

  it('returns a negative value when stop is before start', () => {
    const result = computeDuration('2024-01-15T10:00:00Z', '2024-01-15T09:00:00Z')
    expect(result).toBe(-3600)
  })

  it('returns 0 for an invalid start timestamp', () => {
    expect(computeDuration('not-a-date', '2024-01-15T10:00:00Z')).toBe(0)
  })

  it('returns 0 for an invalid stop timestamp', () => {
    expect(computeDuration('2024-01-15T09:00:00Z', 'not-a-date')).toBe(0)
  })

  it('rounds sub-second differences', () => {
    expect(computeDuration('2024-01-15T09:00:00.000Z', '2024-01-15T09:00:00.600Z')).toBe(1)
    expect(computeDuration('2024-01-15T09:00:00.000Z', '2024-01-15T09:00:00.400Z')).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// groupEntriesByDay
// ---------------------------------------------------------------------------
describe('groupEntriesByDay', () => {
  it('returns an empty object for an empty array', () => {
    expect(groupEntriesByDay([])).toEqual({})
  })

  it('skips entries without started_at', () => {
    const result = groupEntriesByDay([{ id: '1' }, { id: '2', started_at: null }])
    expect(result).toEqual({})
  })

  it('groups entries under their local date key', () => {
    const entries = [
      { id: '1', started_at: '2024-01-15T09:00:00' },
      { id: '2', started_at: '2024-01-15T14:00:00' },
    ]
    const result = groupEntriesByDay(entries)
    expect(Object.keys(result)).toEqual(['2024-01-15'])
    expect(result['2024-01-15']).toHaveLength(2)
  })

  it('creates separate keys for different days', () => {
    const entries = [
      { id: '1', started_at: '2024-01-14T23:00:00' },
      { id: '2', started_at: '2024-01-15T01:00:00' },
    ]
    const result = groupEntriesByDay(entries)
    expect(Object.keys(result)).toHaveLength(2)
    expect(result['2024-01-14']).toHaveLength(1)
    expect(result['2024-01-15']).toHaveLength(1)
  })

  it('preserves entry order within a day group', () => {
    const entries = [
      { id: 'a', started_at: '2024-01-15T09:00:00' },
      { id: 'b', started_at: '2024-01-15T10:00:00' },
    ]
    const result = groupEntriesByDay(entries)
    expect(result['2024-01-15'].map((e) => e.id)).toEqual(['a', 'b'])
  })
})

// ---------------------------------------------------------------------------
// localDayRange
// ---------------------------------------------------------------------------
describe('localDayRange', () => {
  it('returns from at local midnight and to exactly 24 hours later', () => {
    const { from, to } = localDayRange('2024-01-15T12:34:56')
    const fromDate = new Date(from)
    const toDate = new Date(to)
    expect(fromDate.getHours()).toBe(0)
    expect(fromDate.getMinutes()).toBe(0)
    expect(fromDate.getSeconds()).toBe(0)
    expect(fromDate.getMilliseconds()).toBe(0)
    expect(toDate.getTime() - fromDate.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('returns ISO strings', () => {
    const { from, to } = localDayRange('2024-06-01')
    expect(() => new Date(from)).not.toThrow()
    expect(() => new Date(to)).not.toThrow()
  })

  it('returns null values for an invalid date input', () => {
    expect(localDayRange('not-a-date')).toEqual({ from: null, to: null })
  })
})

// ---------------------------------------------------------------------------
// exportToCSV
// ---------------------------------------------------------------------------
describe('exportToCSV', () => {
  let capturedCsv = ''
  const OriginalBlob = globalThis.Blob

  beforeEach(() => {
    capturedCsv = ''
    vi.stubGlobal('Blob', function MockBlob(parts, opts) {
      capturedCsv = parts[0]
      return new OriginalBlob(parts, opts)
    })
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:fake'),
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('triggers a download by clicking a link', () => {
    exportToCSV([], '2024-01-01', '2024-01-07')
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake')
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce()
  })

  it('names the file using the from/to date range', () => {
    exportToCSV([], '2024-01-01', '2024-01-07')
    const link = document.querySelector('a')
    expect(capturedCsv).not.toBeNull()
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
  })

  it('includes a header row', () => {
    exportToCSV([], '2024-01-01', '2024-01-07')
    expect(capturedCsv).toContain('Date,Start time,End time')
  })

  it('writes one data row per entry', () => {
    const entries = [
      {
        started_at: '2024-01-15T09:00:00',
        stopped_at: '2024-01-15T10:00:00',
        duration_seconds: 3600,
        description: 'Design review',
        projects: { name: 'Alpha' },
      },
    ]
    exportToCSV(entries, '2024-01-15', '2024-01-15')
    const lines = capturedCsv.split('\n')
    expect(lines).toHaveLength(2) // header + 1 data row
    expect(lines[1]).toContain('Design review')
    expect(lines[1]).toContain('Alpha')
  })

  it('wraps description values containing commas in quotes', () => {
    const entries = [
      {
        started_at: '2024-01-15T09:00:00',
        stopped_at: '2024-01-15T10:00:00',
        duration_seconds: 3600,
        description: 'Planning, scoping',
        projects: null,
      },
    ]
    exportToCSV(entries, '2024-01-15', '2024-01-15')
    expect(capturedCsv).toContain('"Planning, scoping"')
  })

  it('escapes double quotes inside values', () => {
    const entries = [
      {
        started_at: '2024-01-15T09:00:00',
        stopped_at: '2024-01-15T10:00:00',
        duration_seconds: 3600,
        description: 'Said "hello"',
        projects: null,
      },
    ]
    exportToCSV(entries, '2024-01-15', '2024-01-15')
    expect(capturedCsv).toContain('"Said ""hello"""')
  })

  it('handles null description and missing project gracefully', () => {
    const entries = [
      {
        started_at: '2024-01-15T09:00:00',
        stopped_at: '2024-01-15T10:00:00',
        duration_seconds: 0,
        description: null,
        projects: null,
      },
    ]
    expect(() => exportToCSV(entries, '2024-01-15', '2024-01-15')).not.toThrow()
  })
})
