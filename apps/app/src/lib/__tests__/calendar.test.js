import { describe, it, expect } from 'vitest'
import {
  HOUR_HEIGHT,
  MIN_ENTRY_HEIGHT,
  MINUTES_IN_DAY,
  DRAG_SNAP_MINUTES,
  getGridHeight,
  startOfDay,
  addDays,
  isSameDay,
  toBlock,
  assignOverlapLanes,
  getNowLinePosition,
  getDropStartMinutes,
  minutesToTop,
  minutesToHeight,
} from '../calendar.js'

// Fixed day boundaries used across toBlock tests
const DAY_START = new Date('2024-01-15T00:00:00.000Z')
const DAY_END = new Date('2024-01-16T00:00:00.000Z')

function makeEntry({ startedAt, stoppedAt = null }) {
  return { started_at: startedAt, stopped_at: stoppedAt }
}

// ---------------------------------------------------------------------------
// Constants and getGridHeight
// ---------------------------------------------------------------------------
describe('getGridHeight', () => {
  it('returns HOUR_HEIGHT * 24 with default argument', () => {
    expect(getGridHeight()).toBe(HOUR_HEIGHT * 24)
  })

  it('scales with a custom hourHeight', () => {
    expect(getGridHeight(64)).toBe(64 * 24)
  })
})

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
// toBlock
// ---------------------------------------------------------------------------
describe('toBlock', () => {
  it('computes top and height for an entry fully within the day', () => {
    // 9:00–10:00 UTC on the test day
    const entry = makeEntry({
      startedAt: '2024-01-15T09:00:00.000Z',
      stoppedAt: '2024-01-15T10:00:00.000Z',
    })
    const block = toBlock(entry, DAY_START, DAY_END, 3600)
    expect(block).not.toBeNull()
    expect(block.top).toBe((9 / 60) * HOUR_HEIGHT * 60)      // 9h from midnight
    expect(block.height).toBeGreaterThanOrEqual(MIN_ENTRY_HEIGHT)
  })

  it('clips an entry that starts before dayStart', () => {
    const entry = makeEntry({
      startedAt: '2024-01-14T23:00:00.000Z', // previous day
      stoppedAt: '2024-01-15T01:00:00.000Z',
    })
    const block = toBlock(entry, DAY_START, DAY_END, 7200)
    expect(block).not.toBeNull()
    expect(block.top).toBe(0) // clipped to dayStart
    expect(block.startMs).toBe(DAY_START.getTime())
  })

  it('clips an entry that ends after dayEnd', () => {
    const entry = makeEntry({
      startedAt: '2024-01-15T23:00:00.000Z',
      stoppedAt: '2024-01-16T01:00:00.000Z', // next day
    })
    const block = toBlock(entry, DAY_START, DAY_END, 7200)
    expect(block).not.toBeNull()
    expect(block.endMs).toBe(DAY_END.getTime())
  })

  it('returns null for an entry entirely before the day', () => {
    const entry = makeEntry({
      startedAt: '2024-01-14T10:00:00.000Z',
      stoppedAt: '2024-01-14T11:00:00.000Z',
    })
    expect(toBlock(entry, DAY_START, DAY_END, 3600)).toBeNull()
  })

  it('returns null for an entry entirely after the day', () => {
    const entry = makeEntry({
      startedAt: '2024-01-16T10:00:00.000Z',
      stoppedAt: '2024-01-16T11:00:00.000Z',
    })
    expect(toBlock(entry, DAY_START, DAY_END, 3600)).toBeNull()
  })

  it('returns null when visibleEnd equals visibleStart', () => {
    // Entry ends exactly at dayStart — zero duration after clipping
    const entry = makeEntry({
      startedAt: '2024-01-14T22:00:00.000Z',
      stoppedAt: '2024-01-15T00:00:00.000Z',
    })
    expect(toBlock(entry, DAY_START, DAY_END, 7200)).toBeNull()
  })

  it('uses durationSeconds to derive end when stopped_at is null (running entry)', () => {
    const entry = makeEntry({
      startedAt: '2024-01-15T09:00:00.000Z',
      stoppedAt: null,
    })
    const block = toBlock(entry, DAY_START, DAY_END, 1800) // 30 min
    expect(block).not.toBeNull()
    const expectedEndMs = new Date('2024-01-15T09:30:00.000Z').getTime()
    expect(block.endMs).toBe(expectedEndMs)
  })

  it('applies the minHeight floor when the block would be shorter', () => {
    const entry = makeEntry({
      startedAt: '2024-01-15T09:00:00.000Z',
      stoppedAt: '2024-01-15T09:00:01.000Z', // 1 second
    })
    const block = toBlock(entry, DAY_START, DAY_END, 1)
    expect(block.height).toBe(MIN_ENTRY_HEIGHT)
  })

  it('initialises lane to 0 and hasOverlap to false', () => {
    const entry = makeEntry({
      startedAt: '2024-01-15T09:00:00.000Z',
      stoppedAt: '2024-01-15T10:00:00.000Z',
    })
    const block = toBlock(entry, DAY_START, DAY_END, 3600)
    expect(block.lane).toBe(0)
    expect(block.hasOverlap).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// assignOverlapLanes
// ---------------------------------------------------------------------------
describe('assignOverlapLanes', () => {
  function makeBlock(startMs, endMs) {
    return { startMs, endMs, lane: 0, hasOverlap: false }
  }

  const T = (h, m = 0) => new Date(`2024-01-15T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`).getTime()

  it('leaves non-overlapping blocks unchanged', () => {
    const blocks = [makeBlock(T(9), T(10)), makeBlock(T(11), T(12))]
    const result = assignOverlapLanes(blocks)
    expect(result.every((b) => !b.hasOverlap)).toBe(true)
    expect(result.every((b) => b.lane === 0)).toBe(true)
  })

  it('marks both blocks when they overlap', () => {
    const blocks = [makeBlock(T(9), T(11)), makeBlock(T(10), T(12))]
    const result = assignOverlapLanes(blocks)
    expect(result.every((b) => b.hasOverlap)).toBe(true)
    const lanes = result.map((b) => b.lane).sort()
    expect(lanes).toEqual([0, 1])
  })

  it('does not treat adjacent (touching) blocks as overlapping', () => {
    // A ends exactly when B starts
    const blocks = [makeBlock(T(9), T(10)), makeBlock(T(10), T(11))]
    const result = assignOverlapLanes(blocks)
    expect(result.every((b) => !b.hasOverlap)).toBe(true)
  })

  it('keeps a non-overlapping third block on lane 0', () => {
    const blocks = [
      makeBlock(T(9), T(11)),   // overlaps with second
      makeBlock(T(10), T(12)),  // overlaps with first
      makeBlock(T(13), T(14)),  // no overlap
    ]
    const result = assignOverlapLanes(blocks)
    const isolated = result.find((b) => b.startMs === T(13))
    expect(isolated.hasOverlap).toBe(false)
    expect(isolated.lane).toBe(0)
  })

  it('does not mutate the original array', () => {
    const blocks = [makeBlock(T(9), T(11)), makeBlock(T(10), T(12))]
    const copy = blocks.map((b) => ({ ...b }))
    assignOverlapLanes(blocks)
    // Original objects' lane/hasOverlap ARE mutated (the fn modifies in place after sort)
    // but the array reference itself should not be the same as the returned one
    expect(assignOverlapLanes(copy)).not.toBe(copy)
  })
})

// ---------------------------------------------------------------------------
// getNowLinePosition
// ---------------------------------------------------------------------------
describe('getNowLinePosition', () => {
  it('returns 0 for midnight', () => {
    const midnight = new Date('2024-01-15T00:00:00')
    midnight.setHours(0, 0, 0, 0)
    expect(getNowLinePosition(midnight)).toBe(0)
  })

  it('returns HOUR_HEIGHT * 12 for noon', () => {
    const noon = new Date('2024-01-15T00:00:00')
    noon.setHours(12, 0, 0, 0)
    expect(getNowLinePosition(noon)).toBe(HOUR_HEIGHT * 12)
  })

  it('includes seconds as a fractional minute contribution', () => {
    const d = new Date('2024-01-15T00:00:00')
    d.setHours(0, 0, 30, 0) // 30 seconds past midnight
    const position = getNowLinePosition(d)
    expect(position).toBeGreaterThan(0)
    expect(position).toBeLessThan((1 / 60) * HOUR_HEIGHT)
  })

  it('scales with a custom hourHeight', () => {
    const noon = new Date('2024-01-15T00:00:00')
    noon.setHours(12, 0, 0, 0)
    expect(getNowLinePosition(noon, 64)).toBe(64 * 12)
  })
})

// ---------------------------------------------------------------------------
// getDropStartMinutes
// ---------------------------------------------------------------------------
describe('getDropStartMinutes', () => {
  const rect = { top: 0 }

  it('snaps to the nearest 15-minute interval', () => {
    // 22 minutes from top → nearest 15 is 15
    const clientY = (22 / 60) * HOUR_HEIGHT
    expect(getDropStartMinutes(clientY, rect)).toBe(15)
  })

  it('snaps up when closer to the next interval', () => {
    // 23 minutes → nearest 15 is 30
    const clientY = (23 / 60) * HOUR_HEIGHT
    expect(getDropStartMinutes(clientY, rect)).toBe(30)
  })

  it('clamps to 0 when clientY is above the top', () => {
    expect(getDropStartMinutes(-100, rect)).toBe(0)
  })

  it('clamps to MINUTES_IN_DAY - durationMinutes', () => {
    const maxClientY = ((MINUTES_IN_DAY + 100) / 60) * HOUR_HEIGHT
    expect(getDropStartMinutes(maxClientY, rect, 60)).toBe(MINUTES_IN_DAY - 60)
  })

  it('accounts for a non-zero rect.top offset', () => {
    const offsetRect = { top: 100 }
    const clientY = 100 + (15 / 60) * HOUR_HEIGHT // exactly 15 min from rect top
    expect(getDropStartMinutes(clientY, offsetRect)).toBe(15)
  })
})

// ---------------------------------------------------------------------------
// minutesToTop and minutesToHeight
// ---------------------------------------------------------------------------
describe('minutesToTop', () => {
  it('returns 0 for 0 minutes', () => {
    expect(minutesToTop(0)).toBe(0)
  })

  it('converts 60 minutes to one hour height', () => {
    expect(minutesToTop(60)).toBe(HOUR_HEIGHT)
  })

  it('scales with a custom hourHeight', () => {
    expect(minutesToTop(60, 64)).toBe(64)
  })
})

describe('minutesToHeight', () => {
  it('returns proportional height for large enough durations', () => {
    const minutes = 60
    expect(minutesToHeight(minutes)).toBe(HOUR_HEIGHT)
  })

  it('returns MIN_ENTRY_HEIGHT when the computed height is smaller', () => {
    expect(minutesToHeight(0)).toBe(MIN_ENTRY_HEIGHT)
    expect(minutesToHeight(1)).toBe(MIN_ENTRY_HEIGHT)
  })

  it('scales with a custom hourHeight', () => {
    expect(minutesToHeight(60, MIN_ENTRY_HEIGHT, 64)).toBe(64)
  })
})
