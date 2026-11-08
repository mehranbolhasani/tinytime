import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { subscribeTicker } from '../ticker.js'

const FIXED_NOW = new Date('2024-01-15T09:00:00.000Z')

describe('ticker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('notifies listeners roughly once per second', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeTicker(listener)

    expect(listener).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1005)
    expect(listener).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1000)
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
  })

  it('stops the timer when the last listener unsubscribes', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeTicker(listener)

    vi.advanceTimersByTime(1005)
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    expect(vi.getTimerCount()).toBe(0)

    vi.advanceTimersByTime(3000)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('does not start a second timer for a second subscriber', () => {
    const first = vi.fn()
    const second = vi.fn()
    const unsubscribeFirst = subscribeTicker(first)
    const unsubscribeSecond = subscribeTicker(second)

    expect(vi.getTimerCount()).toBe(1)

    vi.advanceTimersByTime(1005)
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(1)

    unsubscribeFirst()
    unsubscribeSecond()
    expect(vi.getTimerCount()).toBe(0)
  })
})
