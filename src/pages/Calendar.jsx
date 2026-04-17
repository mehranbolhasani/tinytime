import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DayView from '@/components/calendar/DayView'
import WeekView from '@/components/calendar/WeekView'
import { Button } from '@/components/ui/button'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { cn } from '@/lib/utils'

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

function getWeekStart(date) {
  const dayStart = startOfDay(date)
  const day = dayStart.getDay()
  const diff = (day + 6) % 7
  return addDays(dayStart, -diff)
}

function formatDayLabel(date) {
  return date.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatWeekLabel(weekStart) {
  const weekEnd = addDays(weekStart, 6)
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear()

  if (sameMonth && sameYear) {
    return `${weekStart.getDate()} – ${weekEnd.getDate()} ${weekEnd.toLocaleDateString([], {
      month: 'long',
      year: 'numeric',
    })}`
  }

  return `${weekStart.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
  })} – ${weekEnd.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}`
}

export default function Calendar() {
  const [viewMode, setViewMode] = useState('week')
  const [selectedDate, setSelectedDate] = useState(new Date())

  const { from, to, weekStart } = useMemo(() => {
    if (viewMode === 'day') {
      const dayStart = startOfDay(selectedDate)
      const dayEnd = addDays(dayStart, 1)
      return {
        from: dayStart.toISOString(),
        to: dayEnd.toISOString(),
        weekStart: getWeekStart(selectedDate),
      }
    }

    const start = getWeekStart(selectedDate)
    const end = addDays(start, 7)
    return {
      from: start.toISOString(),
      to: end.toISOString(),
      weekStart: start,
    }
  }, [selectedDate, viewMode])

  const { entries, isLoading, error, activeEntry, entryTagsByEntryId } = useTimeEntries({ from, to })

  const periodLabel = useMemo(() => {
    if (viewMode === 'day') {
      return formatDayLabel(selectedDate)
    }
    return formatWeekLabel(weekStart)
  }, [selectedDate, viewMode, weekStart])

  const shiftDays = viewMode === 'day' ? 1 : 7

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-6">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous period"
            className="rounded-lg border-border transition-colors duration-150"
            onClick={() => setSelectedDate((prev) => addDays(prev, -shiftDays))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next period"
            className="rounded-lg border-border transition-colors duration-150"
            onClick={() => setSelectedDate((prev) => addDays(prev, shiftDays))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-foreground">{periodLabel}</h1>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-border p-0.5">
            <button
              type="button"
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150',
                viewMode === 'day'
                  ? 'bg-foreground text-white'
                  : 'text-muted-foreground hover:bg-secondary'
              )}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
            <button
              type="button"
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150',
                viewMode === 'week'
                  ? 'bg-foreground text-white'
                  : 'text-muted-foreground hover:bg-secondary'
              )}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
          </div>

          <Button
            variant="outline"
            className="rounded-lg border-border transition-colors duration-150"
            onClick={() => setSelectedDate(new Date())}
          >
            Today
          </Button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground/70">
          Loading calendar entries...
        </div>
      ) : viewMode === 'day' ? (
        <DayView
          selectedDate={selectedDate}
          entries={entries}
          activeEntry={activeEntry}
          entryTagsByEntryId={entryTagsByEntryId}
        />
      ) : (
        <WeekView
          weekStart={weekStart}
          entries={entries}
          activeEntry={activeEntry}
          entryTagsByEntryId={entryTagsByEntryId}
        />
      )}
    </section>
  )
}
