import { describe, expect, it } from 'vitest'
import { buildDailyChartData, distributeAcrossHours } from '../reports'

// 2026-07-27 is a Monday.
const MONDAY_9_30 = new Date(2026, 6, 27, 9, 30, 0)

describe('distributeAcrossHours', () => {
  it('splits 09:30–11:15 into 30, 60 and 15 minutes', () => {
    const result = distributeAcrossHours(MONDAY_9_30, new Date(2026, 6, 27, 11, 15, 0))

    expect(result).toEqual([
      { weekday: 0, hour: 9, seconds: 1800 },
      { weekday: 0, hour: 10, seconds: 3600 },
      { weekday: 0, hour: 11, seconds: 900 },
    ])
  })

  it('splits an entry that crosses midnight across two weekdays', () => {
    const result = distributeAcrossHours(
      new Date(2026, 6, 27, 23, 30, 0),
      new Date(2026, 6, 28, 0, 30, 0)
    )

    expect(result).toEqual([
      { weekday: 0, hour: 23, seconds: 1800 },
      { weekday: 1, hour: 0, seconds: 1800 },
    ])
  })

  it('contributes nothing for zero or negative ranges', () => {
    expect(distributeAcrossHours(MONDAY_9_30, MONDAY_9_30)).toEqual([])
    expect(
      distributeAcrossHours(new Date(2026, 6, 27, 11, 0, 0), MONDAY_9_30)
    ).toEqual([])
  })

  it('maps Monday to weekday 0', () => {
    const [first] = distributeAcrossHours(
      MONDAY_9_30,
      new Date(2026, 6, 27, 9, 45, 0)
    )
    expect(first.weekday).toBe(0)
  })
})

function makeEntry(overrides = {}) {
  return {
    id: 'entry-1',
    started_at: new Date(2026, 6, 27, 9, 0, 0).toISOString(),
    stopped_at: new Date(2026, 6, 27, 10, 0, 0).toISOString(),
    duration_seconds: 3600,
    description: 'Work',
    project_id: 'p1',
    projects: { id: 'p1', name: 'Project', color: '#eab308' },
    ...overrides,
  }
}

describe('buildDailyChartData', () => {
  it('fills every day of a Monday-to-Monday week, including empty days', () => {
    const { data } = buildDailyChartData(
      [
        makeEntry({ id: 'a' }),
        makeEntry({
          id: 'b',
          started_at: new Date(2026, 6, 29, 9, 0, 0).toISOString(),
          stopped_at: new Date(2026, 6, 29, 10, 0, 0).toISOString(),
        }),
      ],
      {
        from: new Date(2026, 6, 27).toISOString(),
        to: new Date(2026, 7, 3).toISOString(),
      }
    )

    expect(data).toHaveLength(7)
    expect(data[0].dateKey).toBe('2026-07-27')
    expect(data[6].dateKey).toBe('2026-08-02')

    const emptyBuckets = data.filter((bucket) => Object.keys(bucket).length === 1)
    expect(emptyBuckets).toHaveLength(5)
  })

  it("puts seconds under the entry's local start day and project key", () => {
    const { data, projects } = buildDailyChartData(
      [
        makeEntry({ id: 'a', duration_seconds: 3600 }),
        makeEntry({
          id: 'b',
          project_id: null,
          projects: null,
          duration_seconds: 1800,
        }),
      ],
      { from: null, to: null }
    )

    const bucket = data.find((item) => item.dateKey === '2026-07-27')
    expect(bucket.p1).toBe(3600)
    expect(bucket['no-project']).toBe(1800)
    expect(projects.map((project) => project.id).sort()).toEqual(['no-project', 'p1'])
  })

  it('does not fill empty days for a 90-day range', () => {
    const { data } = buildDailyChartData(
      [
        makeEntry({
          id: 'a',
          started_at: new Date(2026, 0, 2, 9, 0, 0).toISOString(),
        }),
        makeEntry({
          id: 'b',
          started_at: new Date(2026, 1, 3, 9, 0, 0).toISOString(),
        }),
      ],
      {
        from: new Date(2026, 0, 1).toISOString(),
        to: new Date(2026, 3, 1).toISOString(),
      }
    )

    expect(data).toHaveLength(2)
  })

  it('emits one unique bucket per local day across a DST change', () => {
    const { data } = buildDailyChartData([], {
      from: new Date(2026, 2, 23).toISOString(),
      to: new Date(2026, 3, 6).toISOString(),
    })

    expect(data).toHaveLength(14)
    expect(new Set(data.map((bucket) => bucket.dateKey)).size).toBe(14)
  })
})
