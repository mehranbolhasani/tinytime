import { describe, expect, it } from 'vitest'
import { computeElapsedSeconds, isOptimisticEntry } from '../timer.js'

const STARTED_AT = '2024-01-15T09:00:00.000Z'
const STARTED_MS = new Date(STARTED_AT).getTime()

describe('computeElapsedSeconds', () => {
  it('returns 0 for null or undefined input', () => {
    expect(computeElapsedSeconds(null, STARTED_MS)).toBe(0)
    expect(computeElapsedSeconds(undefined, STARTED_MS)).toBe(0)
  })

  it('returns 0 for invalid input', () => {
    expect(computeElapsedSeconds('not-a-date', STARTED_MS)).toBe(0)
  })

  it('returns 0 when the start time is in the future', () => {
    expect(computeElapsedSeconds(STARTED_AT, STARTED_MS - 5000)).toBe(0)
  })

  it('returns whole seconds for a normal elapsed interval', () => {
    expect(computeElapsedSeconds(STARTED_AT, STARTED_MS + 5000)).toBe(5)
    expect(computeElapsedSeconds(STARTED_AT, STARTED_MS + 3_600_000)).toBe(3600)
  })

  it('rounds sub-second differences', () => {
    expect(computeElapsedSeconds(STARTED_AT, STARTED_MS + 5600)).toBe(6)
    expect(computeElapsedSeconds(STARTED_AT, STARTED_MS + 5400)).toBe(5)
  })
})

describe('isOptimisticEntry', () => {
  it('returns true for an optimistic id', () => {
    expect(isOptimisticEntry({ id: 'optimistic-123' })).toBe(true)
  })

  it('returns false for a persisted id', () => {
    expect(isOptimisticEntry({ id: '0f3e9b5a-1234-5678-9abc-def012345678' })).toBe(false)
  })

  it('returns false for null or undefined', () => {
    expect(isOptimisticEntry(null)).toBe(false)
    expect(isOptimisticEntry(undefined)).toBe(false)
  })
})
