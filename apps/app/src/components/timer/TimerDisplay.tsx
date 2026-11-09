import { useTimerContext } from '@/contexts/TimerContext'
import { useElapsedSeconds } from '@/hooks/useElapsedSeconds'
import { cn, formatDurationHMS } from '@/lib/utils'

export default function TimerDisplay() {
  const { activeEntry } = useTimerContext()
  const elapsed = useElapsedSeconds(activeEntry?.started_at)
  const displayTime = activeEntry ? formatDurationHMS(elapsed) : '00:00:00'
  const [hours = '00', minutes = '00', seconds = '00'] = displayTime.split(':')

  return (
    <span
      role="status"
      aria-label={`Timer: ${displayTime}`}
      className={cn(
        'block text-center text-5xl sm:text-6xl md:text-7xl font-bold tabular-nums',
        activeEntry ? 'text-foreground' : 'text-muted-foreground/40'
      )}
    >
      <span>{hours}</span>
      <span>:</span>
      <span>{minutes}</span>
      <span>:</span>
      <span>{seconds}</span>
    </span>
  )
}
