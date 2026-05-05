import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TimeEntry } from '@/types'

interface ActiveEntry {
  started_at: string
}

function getStartedAtMs(entry: ActiveEntry | null | undefined): number | null {
  if (!entry?.started_at) {
    return null
  }

  const startedAt = new Date(entry.started_at).getTime()
  return Number.isNaN(startedAt) ? null : startedAt
}

function getElapsedFromStartedAt(startedAtMs: number | null, now = Date.now()): number {
  if (!startedAtMs) {
    return 0
  }

  return Math.max(0, Math.round((now - startedAtMs) / 1000))
}

export interface UseTimerResult {
  isRunning: boolean
  elapsed: number
  start: (entry: ActiveEntry | null | undefined) => void
  stop: () => string
  reset: () => void
}

export function useTimer(activeEntry: Pick<TimeEntry, 'started_at'> | null | undefined): UseTimerResult {
  const activeStartedAtMs = useMemo(() => getStartedAtMs(activeEntry), [activeEntry])
  const [localStartedAtMs, setLocalStartedAtMs] = useState<number | null>(null)
  const [isLocallyStopped, setIsLocallyStopped] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const startedAtMs = isLocallyStopped ? null : localStartedAtMs ?? activeStartedAtMs
  const isRunning = startedAtMs !== null

  useEffect(() => {
    if (!isRunning || !startedAtMs) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isRunning, startedAtMs])

  const start = useCallback((entry: ActiveEntry | null | undefined) => {
    const nextStartedAtMs = getStartedAtMs(entry)
    if (!nextStartedAtMs) {
      return
    }

    setLocalStartedAtMs(nextStartedAtMs)
    setIsLocallyStopped(false)
    setNowMs(Date.now())
  }, [])

  const stop = useCallback((): string => {
    const stoppedAt = new Date().toISOString()
    setIsLocallyStopped(true)
    setNowMs(Date.now())
    return stoppedAt
  }, [])

  const reset = useCallback(() => {
    setLocalStartedAtMs(null)
    setIsLocallyStopped(true)
    setNowMs(Date.now())
  }, [])

  const elapsed = getElapsedFromStartedAt(startedAtMs, nowMs)

  return {
    isRunning,
    elapsed,
    start,
    stop,
    reset,
  }
}
