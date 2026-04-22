import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DayView from '@/components/calendar/DayView'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTimerContext } from '@/contexts/TimerContext'
import { useTimeEntriesList } from '@/hooks/useTimeEntries'
import { localDayRange } from '@/lib/utils'

function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatDayLabel(date) {
  return date.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date())

  const { from, to } = useMemo(() => localDayRange(selectedDate), [selectedDate])

  const { activeEntry } = useTimerContext()
  const { entries, isLoading, error, entryTagsByEntryId } = useTimeEntriesList({ from, to })

  const periodLabel = useMemo(() => formatDayLabel(selectedDate), [selectedDate])

  return (
    <section className="space-y-3">
      <header className="rounded-xl bg-card p-3 flex items-center justify-between">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous day"
            className="h-8 w-8 rounded-md text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
            onClick={() => setSelectedDate((prev) => addDays(prev, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-center text-sm font-medium text-foreground">{periodLabel}</h1>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next day"
            className="h-8 w-8 rounded-md text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
            onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 flex justify-end">
          <Button
            variant="outline"
            className="h-8 rounded-md border-border text-sm transition-colors duration-150"
            onClick={() => setSelectedDate(new Date())}
          >
            Today
          </Button>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-[0px_1px_0px_rgba(0,0,0,0.05)]">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : (
        <DayView
          selectedDate={selectedDate}
          entries={entries}
          activeEntry={activeEntry}
          entryTagsByEntryId={entryTagsByEntryId}
        />
      )}
    </section>
  )
}
