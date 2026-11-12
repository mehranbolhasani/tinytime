import { useMinuteNow } from '@/hooks/useMinuteNow'
import { getNowLinePosition } from '@/lib/calendar'

interface NowLineProps {
  hourHeight: number
}

export default function NowLine({ hourHeight }: NowLineProps) {
  const now = useMinuteNow()

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
      style={{ top: getNowLinePosition(now, hourHeight) }}
    >
      <span className="h-2 w-2 -translate-x-1 rounded-full bg-primary" />
      <div className="flex-1 border-t border-primary" />
    </div>
  )
}
