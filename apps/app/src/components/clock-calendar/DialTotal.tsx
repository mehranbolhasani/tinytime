import { useElapsedSeconds } from '@/hooks/useElapsedSeconds'
import { computeDuration, formatDuration } from '@/lib/utils'
import type { TimeEntry } from '@/types'

interface DialTotalProps {
  entries: TimeEntry[]
  activeEntry: TimeEntry | null
}

/** Centre text for the dial: total tracked seconds for the day, including the running timer. */
export default function DialTotal({ entries, activeEntry }: DialTotalProps) {
  const elapsed = useElapsedSeconds(activeEntry?.started_at)
  const completedSeconds = entries.reduce((sum, entry) => {
    if (!entry.stopped_at) {
      return sum
    }
    return (
      sum +
      (entry.duration_seconds ?? computeDuration(entry.started_at, entry.stopped_at))
    )
  }, 0)

  return <>{formatDuration(completedSeconds + (activeEntry ? elapsed : 0))}</>
}
