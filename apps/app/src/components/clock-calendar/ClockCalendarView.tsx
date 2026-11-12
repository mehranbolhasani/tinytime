import { useCallback, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronLeft, ChevronRight, List, LoaderCircle, Trash2 } from 'lucide-react'
import ClockCreateBar from '@/components/clock-calendar/ClockCreateBar'
import ClockDial from '@/components/clock-calendar/ClockDial'
import DialTotal from '@/components/clock-calendar/DialTotal'
import DragGhost from '@/components/clock-calendar/DragGhost'
import MonthOverview from '@/components/clock-calendar/MonthOverview'
import DeleteEntryAlertDialog from '@/components/calendar/DeleteEntryAlertDialog'
import EntryDetailSheet from '@/components/calendar/EntryDetailSheet'
import EntryEditDialog from '@/components/calendar/EntryEditDialog'
import { Button } from '@/components/ui/button'
import { useTimerContext } from '@/contexts/TimerContext'
import { useClockGestures } from '@/hooks/useClockGestures'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useMinuteNow } from '@/hooks/useMinuteNow'
import { useProjects } from '@/hooks/useProjects'
import { useTimeEntriesList, useTimeEntryMutations } from '@/hooks/useTimeEntries'
import { addDays, startOfDay } from '@/lib/calendar'
import {
  dateFromDayMinute,
  entriesToDialArcs,
  eventsToDialArcs,
  localMonthRange,
  maxDrawableMinute,
  type DialArc,
} from '@/lib/clockCalendar'
import { toSafeHexColor } from '@/lib/color'
import { presets } from '@/lib/motion'
import {
  computeDuration,
  formatDuration,
  formatTime,
  groupEntriesByDay,
  localDayRange,
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
  const [pendingMove, setPendingMove] = useState<
    (MinuteRange & { color: string; entryId: string }) | null
  >(null)
  const [isDeletingEntry, setIsDeletingEntry] = useState(false)
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [focusedArcId, setFocusedArcId] = useState<string | null>(null)
  const [sheetEntry, setSheetEntry] = useState<TimeEntry | null>(null)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<TimeEntry | null>(null)

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
  }

  const dayRange = useMemo(() => localDayRange(selectedDate), [selectedDate])
  const monthRange = useMemo(
    () => localMonthRange(viewYear, viewMonth),
    [viewYear, viewMonth]
  )

  const { entries, isLoading, error } = useTimeEntriesList({
    from: dayRange.from ?? undefined,
    to: dayRange.to ?? undefined,
  })
  const { entries: monthEntries } = useTimeEntriesList({
    from: monthRange.from,
    to: monthRange.to,
  })
  const { projects } = useProjects()
  const { activeEntry } = useTimerContext()
  const { createEntry, updateEntry, deleteEntry } = useTimeEntryMutations({ entries })
  const isTouchViewport = useMediaQuery('(hover: none)')
  const minuteNow = useMinuteNow()

  const dayStart = useMemo(() => startOfDay(selectedDate), [selectedDate])
  const maxMinute = maxDrawableMinute(dayStart, minuteNow)
  const entriesByDay = useMemo(() => groupEntriesByDay(monthEntries), [monthEntries])

  const completedEntries = useMemo(
    () => entries.filter((entry) => entry.stopped_at !== null),
    [entries]
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
      if (arc.isRunning || !isTouchViewport) {
        setEditingEntry(arc.entry)
      } else {
        setSheetEntry(arc.entry)
      }
    },
    [isTouchViewport]
  )

  const handleCreateDraft = useCallback((range: MinuteRange) => {
    setCreateRange(range)
  }, [])

  const handleRequestDelete = useCallback((entry: TimeEntry) => {
    setMutationError('')
    setEntryToDelete(entry)
  }, [])

  const handleArcDelete = useCallback((arc: DialArc) => {
    setMutationError('')
    setEntryToDelete(arc.entry)
  }, [])

  const handleCommitMove = useCallback(
    (entry: TimeEntry, startMinute: number, endMinute: number) => {
      const startedAt = dateFromDayMinute(dayStart, startMinute).toISOString()
      const stoppedAt = dateFromDayMinute(dayStart, endMinute).toISOString()
      setPendingMove({
        entryId: entry.id,
        startMinute,
        endMinute,
        color: toSafeHexColor(entry.projects?.color, '#e76f51'),
      })
      setMutationError('')
      void updateEntry(entry.id, {
        started_at: startedAt,
        stopped_at: stoppedAt,
        duration_seconds: computeDuration(startedAt, stoppedAt),
      })
        .catch((updateError: unknown) => {
          setMutationError(
            updateError instanceof Error ? updateError.message : 'Unable to move this entry.'
          )
        })
        .finally(() => {
          setPendingMove(null)
        })
    },
    [dayStart, updateEntry]
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

  const activeDraft: MinuteRange | null =
    gestures.draft ?? createRange ?? pendingMove
  const draftColor = gestures.draft
    ? gestures.draftColor
    : pendingMove?.color ?? '#eab308'
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
    setMutationError('')

    try {
      const startedAt = dateFromDayMinute(dayStart, createRange.startMinute).toISOString()
      const stoppedAt = dateFromDayMinute(dayStart, createRange.endMinute).toISOString()
      await createEntry({
        description: description.trim() || null,
        project_id: projectId,
        started_at: startedAt,
        stopped_at: stoppedAt,
        duration_seconds: computeDuration(startedAt, stoppedAt),
      })
      setCreateRange(null)
      setDescription('')
      setProjectId(null)
    } catch (createError) {
      setMutationError(
        createError instanceof Error ? createError.message : 'Unable to create entry.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!entryToDelete || isDeletingEntry) {
      return
    }

    setIsDeletingEntry(true)
    setMutationError('')

    try {
      await deleteEntry(entryToDelete.id)
      setEntryToDelete(null)
    } catch (deleteError) {
      setMutationError(
        deleteError instanceof Error ? deleteError.message : 'Unable to delete this entry.'
      )
    } finally {
      setIsDeletingEntry(false)
    }
  }

  const handleDuplicate = async (entry: TimeEntry) => {
    const startedAt = entry.started_at
    const stoppedAt =
      entry.stopped_at ??
      new Date(
        new Date(startedAt).getTime() + (entry.duration_seconds ?? 0) * 1000
      ).toISOString()

    await createEntry({
      description: entry.description,
      project_id: entry.project_id,
      started_at: startedAt,
      stopped_at: stoppedAt,
      duration_seconds: entry.duration_seconds ?? computeDuration(startedAt, stoppedAt),
    })
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
    <section className="space-y-3">
      <header className="flex items-center justify-between gap-2 rounded-xl bg-card p-3">
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

      <AnimatePresence initial={false}>
        {monthOpen ? (
          <motion.div
            key="month-overview"
            variants={presets.panelSwap.variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={presets.panelSwap.transition}
            className="rounded-xl border border-border bg-card p-3"
          >
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
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}
      {mutationError ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {mutationError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-10 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading schedule…
        </div>
      ) : (
        <div className="rounded-xl bg-card p-3">
          <div className="mx-auto flex w-full justify-center">
            <ClockDial
              dayStart={dayStart}
              arcs={arcs}
              eventArcs={eventArcs}
              activeEntry={activeEntry}
              draft={activeDraft}
              draftColor={draftColor}
              draftDetached={gestures.isDetached}
              hiddenEntryId={gestures.hiddenEntryId ?? pendingMove?.entryId ?? null}
              focusedArcId={focusedArcId}
              interactive
              nowMinute={maxMinute}
              svgRef={svgRef}
              onTrackPointerDown={gestures.onTrackPointerDown}
              onArcPointerDown={gestures.onArcPointerDown}
              onArcActivate={handleActivate}
              onArcDelete={handleArcDelete}
              onArcFocusChange={setFocusedArcId}
              centerPrimary={centerPrimary}
              centerSecondary={centerSecondary}
            />
          </div>
          {isLoadingGoogleEvents ? (
            <p className="mt-2 text-center text-xs text-muted-foreground">Loading Google events…</p>
          ) : null}
        </div>
      )}

      <AnimatePresence>
        {gestures.isMoving ? (
          <motion.div
            key="dial-bin"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={presets.panelSwap.transition}
          >
            <motion.div
              ref={binRef}
              animate={{ scale: gestures.isOverBin ? 1.1 : 1 }}
              transition={presets.panelSwap.transition}
              className={
                gestures.isOverBin
                  ? 'flex items-center justify-center gap-2 rounded-xl border border-dashed border-destructive bg-destructive/10 p-3 text-sm text-destructive'
                  : 'flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground'
              }
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span>
                {gestures.isOverBin
                  ? `Release to delete ${movingArc?.label ?? 'this entry'}`
                  : 'Drop to delete'}
              </span>
            </motion.div>
            <span role="status" className="sr-only">
              {gestures.isOverBin
                ? `Release to delete ${movingArc?.label ?? 'this entry'}`
                : 'Drag over the bin to delete'}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {createRange ? (
          <motion.div
            key="create-bar"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={presets.panelSwap.transition}
          >
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
          </motion.div>
        ) : null}
      </AnimatePresence>

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

      <EntryDetailSheet
        entry={sheetEntry}
        open={Boolean(sheetEntry)}
        onOpenChange={(open) => {
          if (!open) setSheetEntry(null)
        }}
        onEdit={(entry) => {
          setSheetEntry(null)
          setEditingEntry(entry)
        }}
        onDuplicate={handleDuplicate}
        onDelete={(entry) => {
          setSheetEntry(null)
          setMutationError('')
          setEntryToDelete(entry)
        }}
      />

      <EntryEditDialog
        entry={editingEntry}
        open={Boolean(editingEntry)}
        onOpenChange={(open) => {
          if (!open) setEditingEntry(null)
        }}
      />

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

      <DeleteEntryAlertDialog
        entry={entryToDelete}
        open={Boolean(entryToDelete)}
        onOpenChange={(open) => {
          if (!open) setEntryToDelete(null)
        }}
        onConfirm={() => {
          void handleDeleteConfirm()
        }}
        error={mutationError}
        isDeleting={isDeletingEntry}
      />
    </section>
  )
}
