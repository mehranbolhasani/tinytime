import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Clock3, List, Minus, Plus, RotateCcw } from 'lucide-react'
import ClockCalendarView from '@/components/clock-calendar/ClockCalendarView'
import DayView from '@/components/calendar/DayView'
import FloatingAlerts, { FloatingAlert } from '@/components/layout/FloatingAlerts'
import PageShell from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { useTimerContext } from '@/contexts/TimerContext'
import { googleEventsQueryOptions, useGoogleCalendar, useGoogleEventsForRange } from '@/hooks/useGoogleCalendar'
import { timeEntriesListQueryOptions, useTimeEntriesList } from '@/hooks/useTimeEntries'
import { addDays, localDayRange } from '@/lib/dates'
import { CALENDAR_SHORTCUT_EVENT, type CalendarShortcutDirection } from '@/lib/keyboardShortcuts'
import { assertSupabaseClient } from '@/lib/supabase'

const ZOOM_STORAGE_KEY = 'tinytime:calendar.zoom-v2'
const VIEW_STORAGE_KEY = 'tinytime:calendar.view'
const DEFAULT_ZOOM_INDEX = 0

type CalendarViewMode = 'clock' | 'list'

/** Multiples of the height that fits all 24 hours in the grid area. */
const ZOOM_STEPS = [1, 1.5, 2, 3] as const

const zoomLabel = (index: number) =>
  index === 0 ? 'Fit' : `${Math.round((ZOOM_STEPS[index] ?? 1) * 100)}%`

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
  if (raw === 'clock' || raw === 'list') {
    return raw
  }
  // Touch devices cannot create entries in the list view, so default to the clock.
  return window.matchMedia('(hover: none)').matches ? 'clock' : 'list'
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
    <FloatingAlert
      role={isError ? 'alert' : 'status'}
      tone={isError ? 'warning' : 'success'}
      onDismiss={() => {
        const params = new URLSearchParams(searchParams)
        params.delete('google')
        params.delete('reason')
        setSearchParams(params, { replace: true })
      }}
    >
      <p>{message}</p>
    </FloatingAlert>
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
  const viewParam = searchParams.get('view')
  const viewMode: CalendarViewMode =
    viewParam === 'clock' ? 'clock' : viewParam === 'list' ? 'list' : readViewMode()

  const [zoomIndex, setZoomIndex] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_ZOOM_INDEX
    }

    // The pre-9b.1 key held pixel heights; drop it so it cannot read as a step.
    window.localStorage.removeItem('tinytime:calendar.zoom-index')

    const raw = Number(window.localStorage.getItem(ZOOM_STORAGE_KEY))
    if (!Number.isInteger(raw) || raw < 0 || raw >= ZOOM_STEPS.length) {
      return DEFAULT_ZOOM_INDEX
    }
    return raw
  })
  const zoom = ZOOM_STEPS[zoomIndex] ?? ZOOM_STEPS[DEFAULT_ZOOM_INDEX]

  const { from, to } = useMemo(() => localDayRange(selectedDate), [selectedDate])

  const queryClient = useQueryClient()
  const supabase = assertSupabaseClient()
  const { activeEntry } = useTimerContext()
  const { entries, isPlaceholderData, error } = useTimeEntriesList({ from: from ?? undefined, to: to ?? undefined })
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

  const changeZoom = (nextIndex: number) => {
    setZoomIndex(nextIndex)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ZOOM_STORAGE_KEY, String(nextIndex))
    }
  }

  const changeViewMode = (mode: CalendarViewMode) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, mode)
    }
    const params = new URLSearchParams(searchParams)
    params.set('view', mode)
    setSearchParams(params, { replace: true })
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
      <PageShell title="Calendar" subtitle={periodLabel} contentClassName="relative flex flex-col">
        <FloatingAlerts>
          <GoogleResultBanner />
          {googleEventsError ? (
            <FloatingAlert tone="warning">{googleEventsError.message}</FloatingAlert>
          ) : null}
        </FloatingAlerts>
        <div className="min-h-0 flex-1">
          <ClockCalendarView
            selectedDate={selectedDate}
            onSelectedDateChange={setSelectedDate}
            googleEvents={googleEvents}
            isLoadingGoogleEvents={isLoadingGoogleEvents}
            onSwitchToList={() => changeViewMode('list')}
          />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Calendar" subtitle={periodLabel} contentClassName="relative flex flex-col">
      <FloatingAlerts>
        <GoogleResultBanner />
        {error ? <FloatingAlert>{error.message}</FloatingAlert> : null}
        {googleEventsError ? (
          <FloatingAlert tone="warning">{googleEventsError.message}</FloatingAlert>
        ) : null}
      </FloatingAlerts>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 p-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous day"
            className="text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => setSelectedDate((prev) => addDays(prev, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next day"
            className="text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Switch to clock calendar view"
            onClick={() => changeViewMode('clock')}
          >
            <Clock3 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2">
        <span className="min-w-12 text-center text-xs font-medium text-muted-foreground">
          Zoom: {zoomLabel(zoomIndex)}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Zoom out calendar"
            className="h-6 w-6 text-muted-foreground hover:bg-secondary hover:text-foreground"
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
            className="h-6 w-6 text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => changeZoom(Math.min(ZOOM_STEPS.length - 1, zoomIndex + 1))}
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => changeZoom(DEFAULT_ZOOM_INDEX)}
            disabled={zoomIndex === DEFAULT_ZOOM_INDEX}
            aria-label="Fit day to screen"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            aria-label="List view active"
            disabled
          >
            <List className="h-3 w-3" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-3 pb-3">
        <DayView
          selectedDate={selectedDate}
          entries={entries}
          activeEntry={activeEntry}
          googleEvents={googleEvents}
          isLoadingGoogleEvents={isLoadingGoogleEvents}
          isStale={isPlaceholderData}
          zoom={zoom}
          onSwitchToClock={() => changeViewMode('clock')}
        />
      </div>
    </PageShell>
  )
}
