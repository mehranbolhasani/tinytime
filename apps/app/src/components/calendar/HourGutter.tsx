import { HOURS } from '@/lib/calendar'

interface HourGutterProps {
  hourHeight: number
  gridHeight: number
}

export default function HourGutter({ hourHeight, gridHeight }: HourGutterProps) {
  return (
    <div className="relative border-r border-border bg-secondary/50" style={{ height: gridHeight }}>
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute inset-x-0 border-t border-border px-2 text-right text-xs tabular-nums text-muted-foreground/70"
          style={{ top: hour * hourHeight, height: hourHeight, lineHeight: `${hourHeight}px` }}
        >
          {String(hour).padStart(2, '0')}
        </div>
      ))}
    </div>
  )
}
