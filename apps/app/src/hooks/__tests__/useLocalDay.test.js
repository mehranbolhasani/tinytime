import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLocalDay } from '../useLocalDay.js'

function assertIsMidnight(date) {
  expect(date.getHours()).toBe(0)
  expect(date.getMinutes()).toBe(0)
  expect(date.getSeconds()).toBe(0)
  expect(date.getMilliseconds()).toBe(0)
}

describe('useLocalDay', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns local midnight of the current day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 29, 13, 45, 12))

    const { result } = renderHook(() => useLocalDay())

    assertIsMidnight(result.current)
    expect(result.current.getFullYear()).toBe(2026)
    expect(result.current.getMonth()).toBe(6)
    expect(result.current.getDate()).toBe(29)
  })

  it('advances to the next midnight after the day changes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 29, 23, 59, 0))

    const { result } = renderHook(() => useLocalDay())
    expect(result.current.getDate()).toBe(29)

    act(() => {
      vi.advanceTimersByTime(62_000)
    })

    expect(result.current.getDate()).toBe(30)
    assertIsMidnight(result.current)
  })

  it('does not change the returned object within the same day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 29, 9, 0, 0))

    const { result } = renderHook(() => useLocalDay())
    const first = result.current

    act(() => {
      vi.advanceTimersByTime(60_000)
      window.dispatchEvent(new Event('focus'))
    })

    expect(result.current).toBe(first)
  })
})
