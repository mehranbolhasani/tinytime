import { describe, expect, it } from 'vitest'
import {
  MINUTES_IN_DAY,
  advanceSweep,
  angleToMinute,
  assignLanes,
  buildMonthGrid,
  describeArc,
  entriesToDialArcs,
  minuteToAngle,
  normalizeRange,
  startSweep,
} from '../clockCalendar'
import type { TimeEntry } from '@/types'

function makeEntry(overrides: Partial<TimeEntry>): TimeEntry {
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

describe('minuteToAngle / angleToMinute', () => {
  it('puts 00:00 at the top and 06:00 on the right', () => {
    expect(minuteToAngle(0)).toBeCloseTo(-Math.PI / 2, 6)
    expect(Math.cos(minuteToAngle(6 * 60))).toBeCloseTo(1, 6)
    expect(Math.sin(minuteToAngle(6 * 60))).toBeCloseTo(0, 6)
  })

  it('round-trips angle and minutes', () => {
    for (const minute of [0, 60, 360, 540, 720, 1020, 1410]) {
      expect(angleToMinute(minuteToAngle(minute))).toBeCloseTo(minute, 4)
    }
  })
})

describe('cumulative sweep', () => {
  it('keeps sweeping clockwise past the top instead of jumping to zero', () => {
    let sweep = startSweep(minuteToAngle(23 * 60 + 30))
    sweep = advanceSweep(sweep, minuteToAngle(0))
    sweep = advanceSweep(sweep, minuteToAngle(10))

    expect(sweep.accumulated).toBeCloseTo(40, 4)
    expect(Math.min(MINUTES_IN_DAY, sweep.originMinute + sweep.accumulated)).toBe(1440)
  })

  it('clamps at midnight when sweeping counter-clockwise past the top', () => {
    let sweep = startSweep(minuteToAngle(30))
    sweep = advanceSweep(sweep, minuteToAngle(23 * 60 + 50))

    expect(sweep.accumulated).toBeCloseTo(-40, 4)
    expect(Math.max(0, sweep.originMinute + sweep.accumulated)).toBe(0)
  })

  it('accumulates a full clockwise turn as +1440 minutes', () => {
    let sweep = startSweep(minuteToAngle(0))
    for (let hour = 1; hour <= 24; hour += 1) {
      sweep = advanceSweep(sweep, minuteToAngle(hour * 60))
    }
    expect(sweep.accumulated).toBeCloseTo(MINUTES_IN_DAY, 4)
  })
})

describe('normalizeRange', () => {
  it('orders reversed input', () => {
    expect(normalizeRange(600, 540, MINUTES_IN_DAY)).toEqual({
      startMinute: 540,
      endMinute: 600,
    })
  })

  it('returns null for a tap', () => {
    expect(normalizeRange(540, 540, MINUTES_IN_DAY)).toBeNull()
  })

  it('expands a sub-snap sweep to the minimum block', () => {
    expect(normalizeRange(540, 545, MINUTES_IN_DAY)).toEqual({
      startMinute: 540,
      endMinute: 555,
    })
  })

  it('clamps the end to now for today', () => {
    expect(normalizeRange(990, 1200, 1100)).toEqual({
      startMinute: 990,
      endMinute: 1100,
    })
  })

  it('returns null for a future day', () => {
    expect(normalizeRange(100, 200, 0)).toBeNull()
  })
})

describe('entriesToDialArcs', () => {
  const dayStart = new Date(2026, 6, 29, 0, 0, 0, 0)

  it('clips an entry that crosses midnight', () => {
    const [arc] = entriesToDialArcs(
      [makeEntry({
        started_at: new Date(2026, 6, 29, 23, 0, 0).toISOString(),
        stopped_at: new Date(2026, 6, 30, 1, 0, 0).toISOString(),
        duration_seconds: 7200,
      })],
      dayStart,
      new Date(2026, 6, 30, 12, 0, 0)
    )

    expect(arc.startMinute).toBe(23 * 60)
    expect(arc.endMinute).toBe(MINUTES_IN_DAY)
  })

  it('ends a running entry at now', () => {
    const [arc] = entriesToDialArcs(
      [makeEntry({
        started_at: new Date(2026, 6, 29, 10, 0, 0).toISOString(),
        stopped_at: null,
        duration_seconds: null,
      })],
      dayStart,
      new Date(2026, 6, 29, 11, 0, 0)
    )

    expect(arc.isRunning).toBe(true)
    expect(arc.startMinute).toBe(600)
    expect(arc.endMinute).toBe(660)
  })

  it('excludes entries wholly on another day', () => {
    const arcs = entriesToDialArcs(
      [makeEntry({
        started_at: new Date(2026, 6, 28, 9, 0, 0).toISOString(),
        stopped_at: new Date(2026, 6, 28, 10, 0, 0).toISOString(),
      })],
      dayStart,
      new Date(2026, 6, 29, 12, 0, 0)
    )

    expect(arcs).toHaveLength(0)
  })
})

describe('assignLanes', () => {
  it('puts three mutually overlapping items in lanes 0, 1 and 2', () => {
    const laned = assignLanes([
      { startMinute: 0, endMinute: 100 },
      { startMinute: 10, endMinute: 110 },
      { startMinute: 20, endMinute: 120 },
    ])

    expect(laned.map((item) => item.lane)).toEqual([0, 1, 2])
  })

  it('reuses lane 0 for back-to-back items', () => {
    const laned = assignLanes([
      { startMinute: 0, endMinute: 60 },
      { startMinute: 60, endMinute: 120 },
    ])

    expect(laned.map((item) => item.lane)).toEqual([0, 0])
  })

  it('caps a fourth overlapping item at lane 2', () => {
    const laned = assignLanes([
      { startMinute: 0, endMinute: 200 },
      { startMinute: 10, endMinute: 210 },
      { startMinute: 20, endMinute: 220 },
      { startMinute: 30, endMinute: 230 },
    ])

    expect(laned.map((item) => item.lane)).toEqual([0, 1, 2, 2])
  })
})

describe('describeArc / buildMonthGrid', () => {
  it('draws a full day as two arc segments', () => {
    const path = describeArc(100, 100, 50, 0, MINUTES_IN_DAY)
    expect(path.startsWith('M ')).toBe(true)
    expect(path.match(/ A /g)).toHaveLength(2)
  })

  it('draws a normal range as one arc', () => {
    const path = describeArc(100, 100, 50, 540, 630)
    expect(path.match(/ A /g)).toHaveLength(1)
  })

  it('starts the month grid on a Monday', () => {
    const cells = buildMonthGrid(2026, 6)
    expect(cells).toHaveLength(42)
    expect(cells[0].getDay()).toBe(1)
  })
})
