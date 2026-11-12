import { describe, it, expect } from 'vitest'
import {
  addDays,
  isSameDay,
  localDateInputRange,
  localDateKey,
  localDayRange,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '../dates.js'

// ---------------------------------------------------------------------------
// startOfDay
// ---------------------------------------------------------------------------
describe('startOfDay', () => {
  it('sets the time to local midnight', () => {
    const d = new Date('2024-06-15T14:30:45.123')
    const result = startOfDay(d)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  it('preserves the original date unchanged', () => {
    const d = new Date('2024-06-15T14:30:00')
    const original = d.getTime()
    startOfDay(d)
    expect(d.getTime()).toBe(original)
  })
})

// ---------------------------------------------------------------------------
// addDays
// ---------------------------------------------------------------------------
describe('addDays', () => {
  it('advances a date by the given number of days', () => {
    const d = new Date('2024-01-15T00:00:00')
    const result = addDays(d, 3)
    expect(result.getDate()).toBe(18)
  })

  it('goes backwards with negative values', () => {
    const d = new Date('2024-01-15T00:00:00')
    const result = addDays(d, -1)
    expect(result.getDate()).toBe(14)
  })

  it('preserves the original date unchanged', () => {
    const d = new Date('2024-01-15T00:00:00')
    addDays(d, 5)
    expect(d.getDate()).toBe(15)
  })
})

// ---------------------------------------------------------------------------
// isSameDay
// ---------------------------------------------------------------------------
describe('isSameDay', () => {
  it('returns true for the same date at different times', () => {
    const a = new Date('2024-01-15T09:00:00')
    const b = new Date('2024-01-15T23:59:59')
    expect(isSameDay(a, b)).toBe(true)
  })

  it('returns false for different dates', () => {
    const a = new Date('2024-01-15T23:59:59')
    const b = new Date('2024-01-16T00:00:00')
    expect(isSameDay(a, b)).toBe(false)
  })

  it('returns false for same day but different month', () => {
    const a = new Date('2024-01-15')
    const b = new Date('2024-02-15')
    expect(isSameDay(a, b)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// startOfWeek
// ---------------------------------------------------------------------------
describe('startOfWeek', () => {
  it('maps a Sunday to the Monday before it', () => {
    const sunday = new Date(2024, 0, 14, 15, 30)
    const result = startOfWeek(sunday)
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(8)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })

  it('keeps a Monday as the start of its week', () => {
    const monday = new Date(2024, 0, 8, 9, 0)
    expect(startOfWeek(monday).getDate()).toBe(8)
  })
})

// ---------------------------------------------------------------------------
// startOfMonth
// ---------------------------------------------------------------------------
describe('startOfMonth', () => {
  it('returns local midnight on the first day of the month', () => {
    const result = startOfMonth(new Date(2024, 5, 18, 15, 30))
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(5)
    expect(result.getDate()).toBe(1)
    expect(result.getHours()).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// localDateKey
// ---------------------------------------------------------------------------
describe('localDateKey', () => {
  it('pads the month and day', () => {
    expect(localDateKey(new Date(2024, 0, 5))).toBe('2024-01-05')
  })

  it('formats a two-digit month and day unchanged', () => {
    expect(localDateKey(new Date(2024, 11, 31))).toBe('2024-12-31')
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
// localDateInputRange
// ---------------------------------------------------------------------------
describe('localDateInputRange', () => {
  it('includes the end date by ending at local midnight the day after to', () => {
    const { from, to } = localDateInputRange('2024-01-01', '2024-01-07')
    expect(from).toBe(new Date(2024, 0, 1).toISOString())
    expect(to).toBe(new Date(2024, 0, 8).toISOString())
  })

  it('returns a one-day range when from and to are the same day', () => {
    const { from, to } = localDateInputRange('2024-01-07', '2024-01-07')
    expect(from).toBe(new Date(2024, 0, 7).toISOString())
    expect(new Date(to).getTime() - new Date(from).getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('returns nulls when from is after to', () => {
    expect(localDateInputRange('2024-01-08', '2024-01-07')).toEqual({ from: null, to: null })
  })

  it('returns nulls for garbage input', () => {
    expect(localDateInputRange('not-a-date', '2024-01-07')).toEqual({ from: null, to: null })
    expect(localDateInputRange('2024-1-1', '2024-01-07')).toEqual({ from: null, to: null })
  })

  it('returns nulls when either value is null', () => {
    expect(localDateInputRange(null, '2024-01-07')).toEqual({ from: null, to: null })
    expect(localDateInputRange('2024-01-01', null)).toEqual({ from: null, to: null })
  })
})
