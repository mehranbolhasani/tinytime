import type { NormalizedGoogleEvent } from '@/types'

interface AllDayEventsProps {
  events: NormalizedGoogleEvent[]
  onStart: (event: NormalizedGoogleEvent) => void
  disabled: boolean
}

export default function AllDayEvents({ events, onStart, disabled }: AllDayEventsProps) {
  if (events.length === 0) {
    return null
  }

  return (
    <div role="group" aria-label="All-day events" className="border-b border-border bg-secondary/40 px-3 py-2">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">All-day events</p>
      <div className="flex flex-wrap gap-1.5">
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onStart(event)}
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: event.calendarColor }} />
            <span className="max-w-[180px] truncate">{event.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
