import { describe, expect, it } from 'vitest'
import { distributeAcrossHours } from '../reports'

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
