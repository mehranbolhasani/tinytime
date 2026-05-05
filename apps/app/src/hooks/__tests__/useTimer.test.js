import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useTimer } from '../useTimer.js'

const FIXED_NOW = new Date('2024-01-15T09:00:00.000Z')

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------

  it('starts idle with zero elapsed when no active entry is given', () => {
    const { result } = renderHook(() => useTimer(null))
    expect(result.current.isRunning).toBe(false)
    expect(result.current.elapsed).toBe(0)
  })

  it('is immediately running when an active entry is passed', () => {
    const startedAt = new Date(FIXED_NOW.getTime() - 5000).toISOString()
    const { result } = renderHook(() => useTimer({ started_at: startedAt }))
    expect(result.current.isRunning).toBe(true)
    expect(result.current.elapsed).toBe(5)
  })

  // ---------------------------------------------------------------------------
  // start()
  // ---------------------------------------------------------------------------

  it('starts running after start() with a valid entry', () => {
    const { result } = renderHook(() => useTimer(null))
    act(() => {
      result.current.start({ started_at: FIXED_NOW.toISOString() })
    })
    expect(result.current.isRunning).toBe(true)
  })

  it('is a no-op when start() is called with null', () => {
    const { result } = renderHook(() => useTimer(null))
    act(() => { result.current.start(null) })
    expect(result.current.isRunning).toBe(false)
  })

  it('is a no-op when start() is called with an invalid started_at', () => {
    const { result } = renderHook(() => useTimer(null))
    act(() => { result.current.start({ started_at: 'not-a-date' }) })
    expect(result.current.isRunning).toBe(false)
  })

  it('is a no-op when start() is called with a missing started_at', () => {
    const { result } = renderHook(() => useTimer(null))
    act(() => { result.current.start({}) })
    expect(result.current.isRunning).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // Elapsed ticking
  // ---------------------------------------------------------------------------

  it('increments elapsed every second via setInterval', () => {
    const { result } = renderHook(() => useTimer(null))
    act(() => {
      result.current.start({ started_at: FIXED_NOW.toISOString() })
    })
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.elapsed).toBe(3)
  })

  it('does not advance elapsed when idle', () => {
    const { result } = renderHook(() => useTimer(null))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.elapsed).toBe(0)
  })

  it('reflects elapsed time from a pre-existing active entry', () => {
    const startedAt = new Date(FIXED_NOW.getTime() - 10000).toISOString()
    const { result } = renderHook(() => useTimer({ started_at: startedAt }))
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.elapsed).toBe(12)
  })

  // ---------------------------------------------------------------------------
  // stop()
  // ---------------------------------------------------------------------------

  it('sets isRunning to false after stop()', () => {
    const { result } = renderHook(() => useTimer(null))
    act(() => { result.current.start({ started_at: FIXED_NOW.toISOString() }) })
    act(() => { result.current.stop() })
    expect(result.current.isRunning).toBe(false)
  })

  it('returns a valid ISO timestamp from stop()', () => {
    const { result } = renderHook(() => useTimer(null))
    act(() => { result.current.start({ started_at: FIXED_NOW.toISOString() }) })
    let stoppedAt
    act(() => { stoppedAt = result.current.stop() })
    expect(stoppedAt).toBeTruthy()
    expect(Number.isNaN(new Date(stoppedAt).getTime())).toBe(false)
  })

  it('elapsed is 0 after stop()', () => {
    const { result } = renderHook(() => useTimer(null))
    act(() => { result.current.start({ started_at: FIXED_NOW.toISOString() }) })
    act(() => { result.current.stop() })
    expect(result.current.elapsed).toBe(0)
  })

  // ---------------------------------------------------------------------------
  // isLocallyStopped overrides activeEntry — the key invariant
  // ---------------------------------------------------------------------------

  it('stays stopped after stop() even when activeEntry is still set (local override)', () => {
    // Simulates the gap between UI stop and server confirming the stop
    const startedAt = new Date(FIXED_NOW.getTime() - 5000).toISOString()
    const activeEntry = { started_at: startedAt }

    const { result } = renderHook(() => useTimer(activeEntry))
    expect(result.current.isRunning).toBe(true)

    act(() => { result.current.stop() })

    // activeEntry prop is still pointing to a running entry, but isLocallyStopped wins
    expect(result.current.isRunning).toBe(false)
    expect(result.current.elapsed).toBe(0)
  })

  it('resumes running when start() is called after a stop()', () => {
    const { result } = renderHook(() => useTimer(null))
    act(() => { result.current.start({ started_at: FIXED_NOW.toISOString() }) })
    act(() => { result.current.stop() })
    expect(result.current.isRunning).toBe(false)

    const newEntry = { started_at: new Date(FIXED_NOW.getTime() + 1000).toISOString() }
    act(() => { result.current.start(newEntry) })
    expect(result.current.isRunning).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // reset()
  // ---------------------------------------------------------------------------

  it('sets isRunning to false after reset()', () => {
    const { result } = renderHook(() => useTimer(null))
    act(() => { result.current.start({ started_at: FIXED_NOW.toISOString() }) })
    act(() => { result.current.reset() })
    expect(result.current.isRunning).toBe(false)
  })

  it('reset() works from idle without throwing', () => {
    const { result } = renderHook(() => useTimer(null))
    expect(() => {
      act(() => { result.current.reset() })
    }).not.toThrow()
    expect(result.current.isRunning).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // Interval cleanup
  // ---------------------------------------------------------------------------

  it('clears the interval when unmounted', () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
    const { result, unmount } = renderHook(() => useTimer(null))
    act(() => { result.current.start({ started_at: FIXED_NOW.toISOString() }) })
    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })
})
