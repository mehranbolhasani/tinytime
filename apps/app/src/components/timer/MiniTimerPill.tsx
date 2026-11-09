import { Button } from '@/components/ui/button'
import { useTimerContext } from '@/contexts/TimerContext'
import { useElapsedSeconds } from '@/hooks/useElapsedSeconds'
import { formatDurationHMS } from '@/lib/utils'

interface MiniTimerPillProps {
  onClick: () => void
}

export default function MiniTimerPill({ onClick }: MiniTimerPillProps) {
  const { activeEntry } = useTimerContext()
  const elapsed = useElapsedSeconds(activeEntry?.started_at)

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="flex h-auto w-[150px] max-w-md items-center justify-between rounded-full border-none bg-card-foreground/90 px-3 py-1 transition-all duration-300 ease-[cubic-bezier(0.8,-0.4,0.5,1)] hover:bg-card-foreground [@media(hover:hover)]:hover:w-[200px]"
    >
      <span className="inline-flex items-center gap-2 text-xs font-medium text-card/50">
        Now
      </span>
      <span className="tabular-nums text-lg font-black text-white">{formatDurationHMS(elapsed)}</span>
    </Button>
  )
}
