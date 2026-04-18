import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DayView from '@/components/calendar/DayView'
import WeekView from '@/components/calendar/WeekView'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTimerContext } from '@/contexts/TimerContext'
import { useViewport } from '@/hooks/useMediaQuery'
import { useTimeEntriesList } from '@/hooks/useTimeEntries'
import { cn, localDayRange } from '@/lib/utils'

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
  const { isMobile } = useViewport()
  const resolvedViewMode = isMobile ? 'day' : viewMode

  const { from, to, weekStart } = useMemo(() => {
    if (resolvedViewMode === 'day') {
      const { from: dayFrom, to: dayTo } = localDayRange(selectedDate)
      return {
        from: dayFrom,
        to: dayTo,
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
  }, [selectedDate, resolvedViewMode])

  const { activeEntry } = useTimerContext()
  const { entries, isLoading, error, entryTagsByEntryId } = useTimeEntriesList({ from, to })

  const periodLabel = useMemo(() => {
    if (resolvedViewMode === 'day') {
      return formatDayLabel(selectedDate)
    }
    return formatWeekLabel(weekStart)
  }, [selectedDate, resolvedViewMode, weekStart])

  const shiftDays = resolvedViewMode === 'day' ? 1 : 7

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-full border border-border bg-secondary p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous period"
            className="h-10 w-10 rounded-full text-muted-foreground transition-colors duration-150 hover:bg-background hover:text-foreground"
            onClick={() => setSelectedDate((prev) => addDays(prev, -shiftDays))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next period"
            className="h-10 w-10 rounded-full text-muted-foreground transition-colors duration-150 hover:bg-background hover:text-foreground"
            onClick={() => setSelectedDate((prev) => addDays(prev, shiftDays))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <h1 className="text-center text-xl font-semibold tracking-tight text-foreground sm:text-left">{periodLabel}</h1>

        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          {!isMobile ? (
            <div className="inline-flex rounded-full border border-border p-0.5">
              <Button
                type="button"
                variant={resolvedViewMode === 'day' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-auto rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150',
                  resolvedViewMode === 'day'
                    ? 'bg-foreground text-background hover:bg-foreground/90'
                    : 'text-muted-foreground hover:bg-secondary'
                )}
                onClick={() => setViewMode('day')}
              >
                Day
              </Button>
              <Button
                type="button"
                variant={resolvedViewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-auto rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150',
                  resolvedViewMode === 'week'
                    ? 'bg-foreground text-background hover:bg-foreground/90'
                    : 'text-muted-foreground hover:bg-secondary'
                )}
                onClick={() => setViewMode('week')}
              >
                Week
              </Button>
            </div>
          ) : null}

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
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : resolvedViewMode === 'day' ? (
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
