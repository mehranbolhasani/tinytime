import { describe, expect, it } from 'vitest'
import {
  angleToMinutes,
  assignClockOverlapLanes,
  buildMonthGrid,
  dateFromPeriodMinute,
  describeArc,
  entriesToClockArcs,
  formatClockRange,
  formatClockTime,
  minutesToAngle,
  minuteOfPeriod,
  normalizeCreateRange,
  periodBounds,
  periodFromDate,
  snapMinutes,
  toClockArc,
  MINUTES_IN_PERIOD,
} from '../clockCalendar'

describe('periodFromDate / periodBounds', () => {
  it('maps morning to AM and afternoon to PM', () => {
    expect(periodFromDate(new Date(2026, 6, 29, 5, 0, 0))).toBe(0)
    expect(periodFromDate(new Date(2026, 6, 29, 12, 0, 0))).toBe(1)
    expect(periodFromDate(new Date(2026, 6, 29, 23, 30, 0))).toBe(1)
  })

  it('returns 12-hour period bounds', () => {
    const dayStart = new Date(2026, 6, 29, 0, 0, 0, 0)
    const am = periodBounds(dayStart, 0)
    expect(am.start.getHours()).toBe(0)
    expect(am.end.getHours()).toBe(12)

    const pm = periodBounds(dayStart, 1)
    expect(pm.start.getHours()).toBe(12)
    expect(pm.end.getDate()).toBe(30)
    expect(pm.end.getHours()).toBe(0)
  })
})

describe('minuteOfPeriod / minutesToAngle / angleToMinutes', () => {
  it('returns minutes within the half-day', () => {
    expect(minuteOfPeriod(new Date(2026, 6, 29, 5, 30, 0))).toBe(5 * 60 + 30)
    expect(minuteOfPeriod(new Date(2026, 6, 29, 17, 15, 0))).toBe(5 * 60 + 15)
  })

  it('maps 0 minutes to 12 o’clock (-π/2)', () => {
    expect(minutesToAngle(0)).toBeCloseTo(-Math.PI / 2)
  })

  it('round-trips angle ↔ minutes', () => {
    for (const minutes of [0, 60, 180, 360, 540, 700]) {
      const angle = minutesToAngle(minutes)
      expect(angleToMinutes(angle)).toBeCloseTo(minutes, 5)
    }
  })
})

describe('snapMinutes / normalizeCreateRange', () => {
  it('snaps to 15-minute increments', () => {
    expect(snapMinutes(7)).toBe(0)
    expect(snapMinutes(8)).toBe(15)
    expect(snapMinutes(22)).toBe(15)
  })

  it('ensures a minimum create duration', () => {
    const range = normalizeCreateRange(60, 60)
    expect(range.endMinute - range.startMinute).toBeGreaterThanOrEqual(15)
  })
})

describe('toClockArc / entriesToClockArcs', () => {
  const dayStart = new Date(2026, 6, 29, 0, 0, 0, 0)

  it('clips an AM entry into the AM period', () => {
    const arc = toClockArc(
      {
        id: '1',
        started_at: new Date(2026, 6, 29, 5, 0, 0).toISOString(),
        stopped_at: new Date(2026, 6, 29, 7, 0, 0).toISOString(),
        duration_seconds: 2 * 3600,
        description: 'Beach',
        project_id: null,
        projects: { id: 'p', name: 'Fun', color: '#eab308' },
      },
      dayStart,
      0,
      2 * 3600
    )

    expect(arc).not.toBeNull()
    expect(arc?.label).toBe('Beach')
    expect(arc?.startMinute).toBe(5 * 60)
    expect(arc?.endMinute).toBe(7 * 60)
    expect(arc?.color).toBe('#eab308')
  })

  it('returns null when entry is outside the period', () => {
    const arc = toClockArc(
      {
        id: '1',
        started_at: new Date(2026, 6, 29, 14, 0, 0).toISOString(),
        stopped_at: new Date(2026, 6, 29, 15, 0, 0).toISOString(),
        duration_seconds: 3600,
        description: 'Work',
        project_id: null,
        projects: null,
      },
      dayStart,
      0,
      3600
    )
    expect(arc).toBeNull()
  })

  it('clips entries that cross noon into the AM period', () => {
    const arc = toClockArc(
      {
        id: '1',
        started_at: new Date(2026, 6, 29, 11, 0, 0).toISOString(),
        stopped_at: new Date(2026, 6, 29, 13, 0, 0).toISOString(),
        duration_seconds: 2 * 3600,
        description: 'Cross',
        project_id: null,
        projects: null,
      },
      dayStart,
      0,
      2 * 3600
    )
    expect(arc).not.toBeNull()
    expect(arc?.endMinute).toBe(MINUTES_IN_PERIOD)
  })

  it('assigns overlap lanes', () => {
    const arcs = entriesToClockArcs(
      [
        {
          id: 'a',
          started_at: new Date(2026, 6, 29, 5, 0, 0).toISOString(),
          stopped_at: new Date(2026, 6, 29, 7, 0, 0).toISOString(),
          duration_seconds: 2 * 3600,
          description: 'A',
          project_id: null,
          projects: null,
        },
        {
          id: 'b',
          started_at: new Date(2026, 6, 29, 6, 0, 0).toISOString(),
          stopped_at: new Date(2026, 6, 29, 8, 0, 0).toISOString(),
          duration_seconds: 2 * 3600,
          description: 'B',
          project_id: null,
          projects: null,
        },
      ],
      dayStart,
      0
    )

    const laned = assignClockOverlapLanes(arcs)
    expect(laned.some((arc) => arc.lane === 1)).toBe(true)
    expect(laned.every((arc) => arc.hasOverlap)).toBe(true)
  })
})

describe('dateFromPeriodMinute / formatClockTime', () => {
  it('builds a date from period minutes', () => {
    const dayStart = new Date(2026, 6, 29, 0, 0, 0, 0)
    const date = dateFromPeriodMinute(dayStart, 0, 5 * 60)
    expect(date.getHours()).toBe(5)
    expect(date.getMinutes()).toBe(0)
  })

  it('formats concept-style times', () => {
    expect(formatClockTime(new Date(2026, 6, 29, 5, 0, 0))).toBe('5am')
    expect(formatClockTime(new Date(2026, 6, 29, 17, 30, 0))).toBe('5:30pm')
    expect(
      formatClockRange(
        new Date(2026, 6, 29, 5, 0, 0),
        new Date(2026, 6, 29, 7, 0, 0)
      )
    ).toBe('5am – 7am')
  })
})

describe('describeArc / buildMonthGrid', () => {
  it('returns a valid SVG arc path', () => {
    const path = describeArc(100, 100, 50, minutesToAngle(0), minutesToAngle(60))
    expect(path.startsWith('M ')).toBe(true)
    expect(path).toContain(' A ')
  })

  it('builds a 6-week month grid', () => {
    const cells = buildMonthGrid(2026, 6)
    expect(cells).toHaveLength(42)
    expect(cells[0].getDay()).toBe(0)
  })
})
