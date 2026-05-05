import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Plus, Minus, RotateCcw } from 'lucide-react'
import DayView from '@/components/calendar/DayView'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTimerContext } from '@/contexts/TimerContext'
import { useGoogleCalendar, useGoogleEventsForRange } from '@/hooks/useGoogleCalendar'
import { useTimeEntriesList } from '@/hooks/useTimeEntries'
import { HOUR_HEIGHT } from '@/lib/calendar'
import { presets } from '@/lib/motion'
import { localDayRange } from '@/lib/utils'

const ZOOM_STORAGE_KEY = 'tinytime.calendar.zoom-index'
const DEFAULT_ZOOM_INDEX = 2

const ZOOM_STEPS = [
  { hourHeight: 22 },
  { hourHeight: 28 },
  { hourHeight: HOUR_HEIGHT },
  { hourHeight: 44 },
]

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [zoomIndex, setZoomIndex] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_ZOOM_INDEX
    }
    const raw = Number(window.localStorage.getItem(ZOOM_STORAGE_KEY))
    if (!Number.isInteger(raw) || raw < 0 || raw >= ZOOM_STEPS.length) {
      return DEFAULT_ZOOM_INDEX
    }
    return raw
  })
  const zoomConfig = ZOOM_STEPS[zoomIndex] ?? ZOOM_STEPS[DEFAULT_ZOOM_INDEX]
  const hourHeight = zoomConfig.hourHeight

  const { from, to } = useMemo(() => localDayRange(selectedDate), [selectedDate])

  const { activeEntry } = useTimerContext()
  const { entries, isLoading, error } = useTimeEntriesList({ from: from ?? undefined, to: to ?? undefined })
  const { connection, calendars, selectedCalendarIds } = useGoogleCalendar()
  const {
    googleEvents,
    isLoadingGoogleEvents,
    googleEventsError,
  } = useGoogleEventsForRange({
    from,
    to,
    selectedCalendarIds,
    calendars,
    enabled: connection.connected && !connection.needsReconnect,
  })

  const periodLabel = useMemo(() => formatDayLabel(selectedDate), [selectedDate])
  const zoomPercent = Math.round((hourHeight / HOUR_HEIGHT) * 100)

  const changeZoom = (nextIndex: number) => {
    setZoomIndex(nextIndex)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ZOOM_STORAGE_KEY, String(nextIndex))
    }
  }

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card p-3">
        <div className="flex items-center justify-between w-full">
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
          <Button
            variant="outline"
            className="h-8 rounded-md border-border text-sm transition-colors duration-150"
            onClick={() => setSelectedDate(new Date())}
          >
            Today
          </Button>
        </div>
      </header>
      <div className="flex items-center justify-between w-full bg-card p-3 rounded-xl">
        <span className="min-w-12 text-center text-xs font-medium text-muted-foreground">
          Zoom {zoomPercent}%
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Zoom out calendar"
            className="h-6 w-6 rounded-md text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
            onClick={() => changeZoom(Math.max(0, zoomIndex - 1))}
            disabled={zoomIndex === 0}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Zoom in calendar"
            className="h-6 w-6 rounded-md text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
            onClick={() => changeZoom(Math.min(ZOOM_STEPS.length - 1, zoomIndex + 1))}
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-md text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
            onClick={() => changeZoom(DEFAULT_ZOOM_INDEX)}
            disabled={zoomIndex === DEFAULT_ZOOM_INDEX}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}
      {googleEventsError ? (
        <div className="rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          {googleEventsError.message}
        </div>
      ) : null}

      <AnimatePresence mode="sync" initial={false}>
        {isLoading ? (
          <motion.div
            key="calendar-loading"
            variants={presets.panelSwap.variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={presets.panelSwap.transition}
            className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-[0px_1px_0px_rgba(0,0,0,0.05)]"
          >
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-56 w-full" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!isLoading ? (
        <DayView
          selectedDate={selectedDate}
          entries={entries}
          activeEntry={activeEntry}
          googleEvents={googleEvents}
          isLoadingGoogleEvents={isLoadingGoogleEvents}
          hourHeight={hourHeight}
          viewportHeight="clamp(420px, 70dvh, 720px)"
        />
      ) : null}
    </section>
  )
}
