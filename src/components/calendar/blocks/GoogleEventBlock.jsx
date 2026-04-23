import { ExternalLink, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { hexToRgba, toSafeHexColor } from '@/lib/color'
import { cn, formatTime } from '@/lib/utils'

export default function GoogleEventBlock({ block, event, onStartTimer, disableStart = false }) {
  const color = toSafeHexColor(event.calendarColor, '#60a5fa')
  const hasOverlap = Boolean(block?.hasOverlap)
  const width = hasOverlap ? 'calc(50% - 12px)' : 'calc(100% - 24px)'
  const left = hasOverlap ? `${block.lane * 50}%` : '1%'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          data-entry-block
          type="button"
          className={cn(
            'absolute z-[5] overflow-hidden rounded-r-lg border-l-2 px-2 py-1 text-left text-[11px] transition-shadow duration-150 hover:shadow-sm'
          )}
          style={{
            top: block.top,
            height: block.height,
            left,
            width,
            backgroundColor: hexToRgba(color, 0.14),
            borderLeftColor: color,
          }}
        >
          <p className="truncate text-[11px] font-semibold" style={{ color }}>
            {event.title}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {formatTime(event.startedAt)} - {formatTime(event.stoppedAt)}
          </p>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] space-y-2 rounded-lg border-border p-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{event.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatTime(event.startedAt)} - {formatTime(event.stoppedAt)}
          </p>
          {event.description ? <p className="text-xs text-muted-foreground">{event.description}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-md text-xs"
            onClick={() => onStartTimer(event)}
            disabled={disableStart}
          >
            <PlayCircle className="mr-1 h-3.5 w-3.5" />
            Start timer from event
          </Button>
          {event.htmlLink ? (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Open
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
