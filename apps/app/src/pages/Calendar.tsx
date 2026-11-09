import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Clock3, List, Minus, Plus, RotateCcw, X } from 'lucide-react'
import ClockCalendarView from '@/components/clock-calendar/ClockCalendarView'
import DayView from '@/components/calendar/DayView'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTimerContext } from '@/contexts/TimerContext'
import { googleEventsQueryOptions, useGoogleCalendar, useGoogleEventsForRange } from '@/hooks/useGoogleCalendar'
import { timeEntriesListQueryOptions, useTimeEntriesList } from '@/hooks/useTimeEntries'
import { HOUR_HEIGHT } from '@/lib/calendar'
import { CALENDAR_SHORTCUT_EVENT, type CalendarShortcutDirection } from '@/lib/keyboardShortcuts'
import { presets } from '@/lib/motion'
import { assertSupabaseClient } from '@/lib/supabase'
import { localDayRange } from '@/lib/utils'

const ZOOM_STORAGE_KEY = 'tinytime.calendar.zoom-index'
const VIEW_STORAGE_KEY = 'tinytime:calendar.view'
const DEFAULT_ZOOM_INDEX = 2

type CalendarViewMode = 'clock' | 'list'

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

function parseDateParam(value: string | null): Date {
  if (!value) {
    return new Date()
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return new Date()
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return new Date()
  }

  return date
}

function toDateParam(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isTodayDate(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

function readViewMode(): CalendarViewMode {
  if (typeof window === 'undefined') {
    return 'list'
  }
  const raw = window.localStorage.getItem(VIEW_STORAGE_KEY)
  return raw === 'clock' ? 'clock' : 'list'
}

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  expired: 'That connection link expired. Please try again.',
  wrong_account:
    'This connection was started from a different tinytime account. Start again from the account you want to connect.',
  denied: "Google access wasn't granted.",
  scope_missing: "Calendar permission wasn't granted. Try again and allow calendar access.",
}

function GoogleResultBanner() {
  const [searchParams, setSearchParams] = useSearchParams()
  const result = searchParams.get('google')
  const reason = searchParams.get('reason')

  if (result !== 'connected' && result !== 'error') {
    return null
  }

  const isError = result === 'error'
  const message = isError
    ? GOOGLE_ERROR_MESSAGES[reason ?? ''] ?? "Couldn't connect Google Calendar. Please try again."
    : 'Google Calendar connected.'

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={
        isError
          ? 'flex items-start justify-between gap-2 rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300'
          : 'flex items-start justify-between gap-2 rounded-lg border border-emerald-300/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300'
      }
    >
      <p>{message}</p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Dismiss"
        className="h-5 w-5 shrink-0"
        onClick={() => {
          const params = new URLSearchParams(searchParams)
          params.delete('google')
          params.delete('reason')
          setSearchParams(params, { replace: true })
        }}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
}

export default function Calendar() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedDate = useMemo(() => parseDateParam(searchParams.get('date')), [searchParams])
  const setSelectedDate = useCallback(
    (next: Date | ((prev: Date) => Date)) => {
      const current = parseDateParam(searchParams.get('date'))
      const nextDate = typeof next === 'function' ? next(current) : next
      const params = new URLSearchParams(searchParams)

      if (isTodayDate(nextDate)) {
        params.delete('date')
      } else {
        params.set('date', toDateParam(nextDate))
      }

      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )
  const [viewMode, setViewMode] = useState<CalendarViewMode>(readViewMode)

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

  const queryClient = useQueryClient()
  const supabase = assertSupabaseClient()
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

  const changeViewMode = (mode: CalendarViewMode) => {
    setViewMode(mode)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, mode)
    }
  }

  const selectedCalendarIdsKey = selectedCalendarIds.join(',')

  useEffect(() => {
    const ranges = [addDays(selectedDate, -1), addDays(selectedDate, 1)]
      .map((date) => localDayRange(date))
      .filter((range): range is { from: string; to: string } => Boolean(range.from && range.to))
    const selectedIds = selectedCalendarIdsKey ? selectedCalendarIdsKey.split(',') : []

    for (const range of ranges) {
      queryClient.prefetchQuery(timeEntriesListQueryOptions(supabase, range))

      if (connection.connected && !connection.needsReconnect && selectedIds.length > 0) {
        queryClient.prefetchQuery(
          googleEventsQueryOptions(supabase, {
            from: range.from,
            to: range.to,
            selectedIds,
          })
        )
      }
    }
  }, [
    connection.connected,
    connection.needsReconnect,
    queryClient,
    selectedCalendarIdsKey,
    selectedDate,
    supabase,
  ])

  useEffect(() => {
    const handleShortcutNavigation = (event: Event) => {
      const shortcutEvent = event as CustomEvent<{ direction?: CalendarShortcutDirection }>
      const direction = shortcutEvent.detail?.direction
      if (direction === 'previous') {
        setSelectedDate((prev) => addDays(prev, -1))
      } else if (direction === 'next') {
        setSelectedDate((prev) => addDays(prev, 1))
      }
    }

    window.addEventListener(CALENDAR_SHORTCUT_EVENT, handleShortcutNavigation)
    return () => {
      window.removeEventListener(CALENDAR_SHORTCUT_EVENT, handleShortcutNavigation)
    }
  }, [setSelectedDate])

  if (viewMode === 'clock') {
    return (
      <div className="space-y-3">
        <GoogleResultBanner />
        {googleEventsError ? (
          <div role="alert" className="rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            {googleEventsError.message}
          </div>
        ) : null}
        <ClockCalendarView
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          googleEvents={googleEvents}
          isLoadingGoogleEvents={isLoadingGoogleEvents}
          onSwitchToList={() => changeViewMode('list')}
        />
      </div>
    )
  }

  return (
    <section className="space-y-3">
      <GoogleResultBanner />
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-8 rounded-md border-border text-sm transition-colors duration-150"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Switch to clock calendar view"
              onClick={() => changeViewMode('clock')}
            >
              <Clock3 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
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
            aria-label="Reset calendar zoom"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-md text-muted-foreground"
            aria-label="List view active"
            disabled
          >
            <List className="h-3 w-3" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}
      {googleEventsError ? (
        <div role="alert" className="rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
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
