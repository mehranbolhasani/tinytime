import { useEffect, useState } from 'react'

/** A Date that updates once per minute, aligned to the next minute boundary. */
export function useMinuteNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const delay = 60_000 - (Date.now() % 60_000)
    let interval: number | undefined

    const timeout = window.setTimeout(() => {
      setNow(new Date())
      interval = window.setInterval(() => setNow(new Date()), 60_000)
    }, delay)

    return () => {
      window.clearTimeout(timeout)
      if (interval !== undefined) {
        window.clearInterval(interval)
      }
    }
  }, [])

  return now
}
