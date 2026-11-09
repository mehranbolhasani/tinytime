import { useEffect, useState } from 'react'

function localMidnight(date = new Date()): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function msUntilNextMidnight(now: Date): number {
  const next = localMidnight(now)
  next.setDate(next.getDate() + 1)
  return next.getTime() - now.getTime() + 1000
}

/** Local midnight of the current day. Changes only when the calendar date changes. */
export function useLocalDay(): Date {
  const [day, setDay] = useState<Date>(() => localMidnight())

  useEffect(() => {
    let timeoutId: number | undefined

    const refresh = () => {
      const next = localMidnight()
      setDay((previous) => (previous.getTime() === next.getTime() ? previous : next))
    }

    const schedule = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
      timeoutId = window.setTimeout(() => {
        refresh()
        schedule()
      }, Math.max(1000, msUntilNextMidnight(new Date())))
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refresh()
      }
    }

    schedule()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', refresh)

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return day
}
