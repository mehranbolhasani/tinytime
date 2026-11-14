import { useCallback, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, List, Trash2 } from 'lucide-react'
import ClockCreateBar from '@/components/clock-calendar/ClockCreateBar'
import ClockDial from '@/components/clock-calendar/ClockDial'
import DialTotal from '@/components/clock-calendar/DialTotal'
import DragGhost from '@/components/clock-calendar/DragGhost'
import MonthOverview from '@/components/clock-calendar/MonthOverview'
import EntryActionDialogs from '@/components/calendar/EntryActionDialogs'
import FloatingAlerts, { FloatingAlert } from '@/components/layout/FloatingAlerts'
import { Button } from '@/components/ui/button'
import { useTimerContext } from '@/contexts/TimerContext'
import { useClockGestures } from '@/hooks/useClockGestures'
import { useEntryActions } from '@/hooks/useEntryActions'
import { useMinuteNow } from '@/hooks/useMinuteNow'
import { usePendingEntryOverride } from '@/hooks/usePendingEntryOverride'
import { useProjects } from '@/hooks/useProjects'
import { useTimeEntriesList } from '@/hooks/useTimeEntries'
import {
  dateFromDayMinute,
  entriesToDialArcs,
  eventsToDialArcs,
  localMonthRange,
  maxDrawableMinute,
  type DialArc,
} from '@/lib/clockCalendar'
import { addDays, localDayRange, startOfDay } from '@/lib/dates'
import {
  computeDuration,
  formatDuration,
  formatTime,
  groupEntriesByDay,
} from '@/lib/utils'
import type { NormalizedGoogleEvent, TimeEntry } from '@/types'

interface MinuteRange {
  startMinute: number
  endMinute: number
}

interface ClockCalendarViewProps {
  selectedDate: Date
  onSelectedDateChange: (date: Date) => void
  googleEvents?: NormalizedGoogleEvent[]
  isLoadingGoogleEvents?: boolean
  onSwitchToList?: () => void
}

interface BinTargetProps {
  binRef: React.RefObject<HTMLDivElement | null>
  isOverBin: boolean
  label?: string
}

/** The delete drop target. Always rendered inside the fixed-height footer slot. */
function BinTarget({ binRef, isOverBin, label }: BinTargetProps) {
  const releaseLabel = `Release to delete ${label ?? 'this entry'}`

  return (
    <div className="relative w-full max-w-xl">
      <div
        ref={binRef}
        className={
          isOverBin
            ? 'flex scale-110 items-center justify-center gap-2 rounded-xl border border-dashed border-destructive bg-destructive/10 p-3 text-sm text-destructive transition-transform duration-150 motion-reduce:transition-none'
            : 'flex scale-100 items-center justify-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground transition-transform duration-150 motion-reduce:transition-none'
        }
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span>{isOverBin ? releaseLabel : 'Drop to delete'}</span>
      </div>
      <span role="status" className="sr-only">
        {isOverBin ? releaseLabel : 'Drag over the bin to delete'}
      </span>
    </div>
  )
}

interface ClockHintProps {
  maxMinute: number
  onSwitchToList?: () => void
}

function ClockHint({ maxMinute, onSwitchToList }: ClockHintProps) {
  return (
    <div className="text-center">
      <p className="text-center text-xs text-muted-foreground">
        {maxMinute > 0
          ? 'Sweep around the ring to log time. Drag a block to move it, or onto the bin to delete it.'
          : 'Future days are read-only. Track time as it happens.'}
      </p>
      {onSwitchToList ? (
        <div className="text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={onSwitchToList}
          >
            Prefer typing? Use the list view
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default function ClockCalendarView({
  selectedDate,
  onSelectedDateChange,
  googleEvents = [],
  isLoadingGoogleEvents = false,
  onSwitchToList,
}: ClockCalendarViewProps) {
  const [monthOpen, setMonthOpen] = useState(false)
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())
  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate)
  const [createRange, setCreateRange] = useState<MinuteRange | null>(null)
  const [awaitingCreatedId, setAwaitingCreatedId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [focusedArcId, setFocusedArcId] = useState<string | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const binRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)

  const handlePointerPosition = useCallback((x: number, y: number) => {
    const element = ghostRef.current
    if (element) {
      element.style.transform = `translate3d(${x + 12}px, ${y + 12}px, 0)`
    }
  }, [])

  if (selectedDate.getTime() !== prevSelectedDate.getTime()) {
    setPrevSelectedDate(selectedDate)
    setViewYear(selectedDate.getFullYear())
    setViewMonth(selectedDate.getMonth())
    // A create started on the previous day will never land in this day's list.
    setCreateRange(null)
    setDescription('')
    setProjectId(null)
    setAwaitingCreatedId(null)
    setIsSaving(false)
  }

  const dayRange = useMemo(() => localDayRange(selectedDate), [selectedDate])
  const monthRange = useMemo(
    () => localMonthRange(viewYear, viewMonth),
    [viewYear, viewMonth]
  )

  const { entries, isLoading, isPlaceholderData, error } = useTimeEntriesList({
    from: dayRange.from ?? undefined,
    to: dayRange.to ?? undefined,
  })
  const { entries: monthEntries } = useTimeEntriesList({
    from: monthRange.from,
    to: monthRange.to,
  })
  const { projects } = useProjects()
  const { activeEntry } = useTimerContext()
  const actions = useEntryActions({ entries })
  // Depend on the stable functions, never on `actions` itself: it is a new
  // object every render, which would defeat every memo below the dial.
  const { clearError, createEntry, openEntry, requestDelete, setError, updateEntry } = actions
  const minuteNow = useMinuteNow()

  const dayStart = useMemo(() => startOfDay(selectedDate), [selectedDate])
  const maxMinute = maxDrawableMinute(dayStart, minuteNow)
  const entriesByDay = useMemo(() => groupEntriesByDay(monthEntries), [monthEntries])

  const { entriesForRendering, setOverride, clearOverride } = usePendingEntryOverride(entries)

  // Hold the drawn draft arc until the created row is in the cache, so the real
  // arc replaces it in the same frame instead of leaving an empty gap. This runs
  // while rendering the cache update, i.e. before the paint that shows the arc.
  if (awaitingCreatedId && entries.some((entry) => entry.id === awaitingCreatedId)) {
    setCreateRange(null)
    setDescription('')
    setProjectId(null)
    setAwaitingCreatedId(null)
    setIsSaving(false)
  }

  const completedEntries = useMemo(
    () => entriesForRendering.filter((entry) => entry.stopped_at !== null),
    [entriesForRendering]
  )
  const arcs = useMemo(
    () => entriesToDialArcs(completedEntries, dayStart, minuteNow),
    [completedEntries, dayStart, minuteNow]
  )
  const eventArcs = useMemo(
    () => eventsToDialArcs(googleEvents, dayStart),
    [googleEvents, dayStart]
  )

  const formatRange = useCallback(
    (range: MinuteRange) => {
      const start = dateFromDayMinute(dayStart, range.startMinute).toISOString()
      const end = dateFromDayMinute(dayStart, range.endMinute).toISOString()
      return `${formatTime(start)}–${formatTime(end)}`
    },
    [dayStart]
  )

  const handleActivate = useCallback(
    (arc: DialArc) => {
      openEntry(arc.entry)
    },
    [openEntry]
  )

  const handleCreateDraft = useCallback((range: MinuteRange) => {
    setCreateRange(range)
  }, [])

  const handleRequestDelete = useCallback(
    (entry: TimeEntry) => {
      requestDelete(entry)
    },
    [requestDelete]
  )

  const handleArcDelete = useCallback(
    (arc: DialArc) => {
      requestDelete(arc.entry)
    },
    [requestDelete]
  )

  const handleCommitMove = useCallback(
    (entry: TimeEntry, startMinute: number, endMinute: number) => {
      const startedAt = dateFromDayMinute(dayStart, startMinute).toISOString()
      const stoppedAt = dateFromDayMinute(dayStart, endMinute).toISOString()
      const durationSeconds = computeDuration(startedAt, stoppedAt)
      clearError()
      // Batches with the gesture's setDraft(null): the real arc appears where the
      // draft was in the same frame, and stays there until the cache matches.
      setOverride({
        entryId: entry.id,
        startedAt,
        stoppedAt,
        durationSeconds,
      })
      void updateEntry(entry.id, {
        started_at: startedAt,
        stopped_at: stoppedAt,
        duration_seconds: durationSeconds,
      }).catch((updateError: unknown) => {
        clearOverride()
        setError(
          updateError instanceof Error ? updateError.message : 'Unable to move this entry.'
        )
      })
    },
    [clearError, clearOverride, dayStart, setError, setOverride, updateEntry]
  )

  const gestures = useClockGestures({
    dayStart,
    arcs,
    maxMinute,
    svgRef,
    binRef,
    onCreateDraft: handleCreateDraft,
    onCommitMove: handleCommitMove,
    onRequestDelete: handleRequestDelete,
    onActivate: handleActivate,
    onPointerPosition: handlePointerPosition,
  })

  const movingArc = gestures.hiddenEntryId
    ? arcs.find((arc) => arc.entry.id === gestures.hiddenEntryId) ?? null
    : null
  const ghostVisible =
    gestures.isMoving && (gestures.isDetached || gestures.isOverBin)

  const activeDraft: MinuteRange | null = gestures.draft ?? createRange
  const draftColor = gestures.draft ? gestures.draftColor : '#eab308'
  const focusedArc = focusedArcId
    ? arcs.find((arc) => arc.entry.id === focusedArcId) ?? null
    : null

  const centerPrimary = activeDraft ? (
    formatRange(activeDraft)
  ) : focusedArc ? (
    focusedArc.label
  ) : (
    <DialTotal entries={completedEntries} activeEntry={activeEntry} />
  )
  const centerSecondary = activeDraft ? (
    formatDuration((activeDraft.endMinute - activeDraft.startMinute) * 60)
  ) : focusedArc ? (
    formatRange(focusedArc)
  ) : undefined

  const handleConfirmDraft = async () => {
    if (!createRange) {
      return
    }

    setIsSaving(true)
    clearError()

    try {
      const startedAt = dateFromDayMinute(dayStart, createRange.startMinute).toISOString()
      const stoppedAt = dateFromDayMinute(dayStart, createRange.endMinute).toISOString()
      const created = await createEntry({
        description: description.trim() || null,
        project_id: projectId,
        started_at: startedAt,
        stopped_at: stoppedAt,
        duration_seconds: computeDuration(startedAt, stoppedAt),
      })
      // isSaving and the draft stay until the render that sees this row in the cache.
      setAwaitingCreatedId(created.id)
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : 'Unable to create entry.'
      )
      setIsSaving(false)
    }
  }

  const headerLabel = useMemo(
    () =>
      selectedDate.toLocaleDateString([], {
        weekday: 'long',
        day: 'numeric',
      }),
    [selectedDate]
  )

  return (
    <section className="relative space-y-0 flex flex-col h-full">
      <header className="flex items-center justify-between gap-2 bg-background p-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous day"
            onClick={() => onSelectedDateChange(addDays(selectedDate, -1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-medium text-foreground"
            aria-expanded={monthOpen}
            aria-label={monthOpen ? 'Collapse month overview' : 'Expand month overview'}
            onClick={() => setMonthOpen((open) => !open)}
          >
            {headerLabel}
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${monthOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next day"
            onClick={() => onSelectedDateChange(addDays(selectedDate, 1))}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSelectedDateChange(new Date())}
          >
            Today
          </Button>
          {onSwitchToList ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Switch to list calendar view"
              onClick={onSwitchToList}
            >
              <List className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </header>

      {monthOpen ? (
        <div className="absolute top-14 left-4 z-40 rounded-xl bg-card/50 backdrop-blur-2xl p-3 max-w-xl">
          <MonthOverview
            selectedDate={selectedDate}
            viewYear={viewYear}
            viewMonth={viewMonth}
            entriesByDay={entriesByDay}
            onSelectDate={(date) => {
              onSelectedDateChange(startOfDay(date))
              setMonthOpen(false)
            }}
            onViewMonthChange={(year, month) => {
              setViewYear(year)
              setViewMonth(month)
            }}
          />
        </div>
      ) : null}

      <FloatingAlerts className="top-16">
        {error ? <FloatingAlert>{error.message}</FloatingAlert> : null}
        {actions.error ? (
          <FloatingAlert onDismiss={clearError} autoDismissMs={6000}>
            {actions.error}
          </FloatingAlert>
        ) : null}
      </FloatingAlerts>

      <div className="relative grid min-h-0 flex-1 place-items-center bg-background p-3 [container-type:size]">
        <ClockDial
          dayStart={dayStart}
          arcs={isLoading ? [] : arcs}
          eventArcs={isLoading ? [] : eventArcs}
          activeEntry={activeEntry}
          draft={activeDraft}
          draftColor={draftColor}
          draftDetached={gestures.isDetached}
          hiddenEntryId={gestures.hiddenEntryId}
          focusedArcId={focusedArcId}
          interactive={!isLoading && !isPlaceholderData}
          dimmed={isPlaceholderData}
          nowMinute={maxMinute}
          svgRef={svgRef}
          onTrackPointerDown={gestures.onTrackPointerDown}
          onArcPointerDown={gestures.onArcPointerDown}
          onArcActivate={handleActivate}
          onArcDelete={handleArcDelete}
          onArcFocusChange={setFocusedArcId}
          centerPrimary={isLoading ? '' : centerPrimary}
          centerSecondary={isLoading ? undefined : centerSecondary}
        />
        {isLoadingGoogleEvents ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-xs text-muted-foreground">
            Loading Google events…
          </p>
        ) : null}
      </div>

      <footer className="relative flex h-24 shrink-0 items-center justify-center px-3">
        {gestures.isMoving ? (
          <BinTarget binRef={binRef} isOverBin={gestures.isOverBin} label={movingArc?.label} />
        ) : createRange ? (
          <ClockCreateBar
            description={description}
            projectId={projectId}
            projects={projects}
            canConfirm={Boolean(createRange)}
            isSaving={isSaving}
            onDescriptionChange={setDescription}
            onProjectChange={setProjectId}
            onConfirm={handleConfirmDraft}
            onCancel={() => {
              setCreateRange(null)
              setDescription('')
              setProjectId(null)
            }}
          />
        ) : (
          <ClockHint maxMinute={maxMinute} onSwitchToList={onSwitchToList} />
        )}
      </footer>

      <EntryActionDialogs actions={actions} />

      {ghostVisible ? (
        <DragGhost
          ghostRef={ghostRef}
          label={movingArc?.label ?? 'Entry'}
          color={movingArc?.color ?? '#a8a29e'}
          duration={
            movingArc
              ? formatDuration((movingArc.endMinute - movingArc.startMinute) * 60)
              : ''
          }
          isOverBin={gestures.isOverBin}
        />
      ) : null}
    </section>
  )
}
