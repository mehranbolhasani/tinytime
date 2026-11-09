import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronLeft, ChevronRight, List, LoaderCircle } from 'lucide-react'
import ClockCreateBar from '@/components/clock-calendar/ClockCreateBar'
import ClockDayCanvas from '@/components/clock-calendar/ClockDayCanvas'
import MonthOverview from '@/components/clock-calendar/MonthOverview'
import DeleteEntryAlertDialog from '@/components/calendar/DeleteEntryAlertDialog'
import EntryDetailSheet from '@/components/calendar/EntryDetailSheet'
import EntryEditDialog from '@/components/calendar/EntryEditDialog'
import { Button } from '@/components/ui/button'
import { useTimerContext } from '@/contexts/TimerContext'
import { useElapsedSeconds } from '@/hooks/useElapsedSeconds'
import { useProjects } from '@/hooks/useProjects'
import { useTimeEntriesList, useTimeEntryMutations } from '@/hooks/useTimeEntries'
import { addDays, isSameDay, startOfDay } from '@/lib/calendar'
import {
  draftToIsoRange,
  localMonthRange,
  periodFromDate,
  type ClockPeriod,
  type DraftRange,
} from '@/lib/clockCalendar'
import { presets } from '@/lib/motion'
import { computeDuration, groupEntriesByDay, localDayRange } from '@/lib/utils'
import type { NormalizedGoogleEvent, TimeEntry } from '@/types'

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
  const [period, setPeriod] = useState<ClockPeriod>(() => periodFromDate(new Date()))
  const [monthOpen, setMonthOpen] = useState(false)
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())
  const [draft, setDraft] = useState<DraftRange | null>(null)
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [sheetEntry, setSheetEntry] = useState<TimeEntry | null>(null)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<TimeEntry | null>(null)

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
  const elapsed = useElapsedSeconds(activeEntry?.started_at)
  const { createEntry, updateEntry, deleteEntry } = useTimeEntryMutations({ entries })

  useEffect(() => {
    setViewYear(selectedDate.getFullYear())
    setViewMonth(selectedDate.getMonth())
  }, [selectedDate])

  useEffect(() => {
    if (isSameDay(selectedDate, new Date())) {
      setPeriod(periodFromDate(new Date()))
    }
  }, [selectedDate])

  const entriesByDay = useMemo(() => groupEntriesByDay(monthEntries), [monthEntries])
  const dayStart = useMemo(() => startOfDay(selectedDate), [selectedDate])

  const headerLabel = useMemo(() => {
    return selectedDate.toLocaleDateString([], {
      weekday: 'long',
      day: 'numeric',
    })
  }, [selectedDate])

  const handleConfirmDraft = async () => {
    if (!draft) return
    setIsSaving(true)
    setMutationError('')
    try {
      const range = draftToIsoRange(dayStart, period, draft)
      await createEntry({
        description: description.trim() || null,
        project_id: projectId,
        started_at: range.started_at,
        stopped_at: range.stopped_at,
        duration_seconds: range.duration_seconds,
      })
      setDraft(null)
      setDescription('')
      setProjectId(null)
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Unable to create entry.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCommitMove = async (entry: TimeEntry, startedAt: string, stoppedAt: string) => {
    setMutationError('')
    try {
      await updateEntry(entry.id, {
        started_at: startedAt,
        stopped_at: stoppedAt,
        duration_seconds: computeDuration(startedAt, stoppedAt),
      })
      setDraft(null)
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Unable to update entry.')
    }
  }

  const handleDuplicate = async (entry: TimeEntry) => {
    const started = new Date(entry.started_at)
    const duration =
      entry.duration_seconds ??
      computeDuration(entry.started_at, entry.stopped_at ?? entry.started_at)
    const nextStart = new Date(started.getTime() + 15 * 60 * 1000)
    const nextStop = new Date(nextStart.getTime() + duration * 1000)
    await createEntry({
      description: entry.description,
      project_id: entry.project_id,
      started_at: nextStart.toISOString(),
      stopped_at: nextStop.toISOString(),
      duration_seconds: duration,
    })
  }

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between gap-2 rounded-xl bg-card p-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
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
            size="icon"
            className="h-8 w-8"
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
            className="h-8 rounded-md"
            onClick={() => onSelectedDateChange(new Date())}
          >
            Today
          </Button>
          {onSwitchToList ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
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
                const clean = startOfDay(date)
                onSelectedDateChange(clean)
                if (isSameDay(clean, new Date())) {
                  setPeriod(periodFromDate(new Date()))
                } else {
                  setPeriod(0)
                }
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
        <div className="rounded-xl">
          <ClockDayCanvas
            selectedDate={selectedDate}
            entries={entries}
            activeEntry={activeEntry}
            liveElapsedSeconds={elapsed}
            googleEvents={googleEvents}
            period={period}
            onPeriodChange={setPeriod}
            draft={draft}
            draftLabel={description}
            onDraftChange={setDraft}
            onSelectEntry={setSheetEntry}
            onCommitMove={handleCommitMove}
          />
          {isLoadingGoogleEvents ? (
            <p className="mt-2 text-center text-xs text-muted-foreground">Loading Google events…</p>
          ) : null}
        </div>
      )}

      <AnimatePresence>
        {draft ? (
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
              canConfirm={Boolean(draft)}
              isSaving={isSaving}
              onDescriptionChange={setDescription}
              onProjectChange={setProjectId}
              onConfirm={handleConfirmDraft}
              onCancel={() => {
                setDraft(null)
                setDescription('')
                setProjectId(null)
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <p className="text-center text-xs text-muted-foreground">
        Drag on the outer ring to create a time block. Tap an arc to edit.
      </p>

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

      <DeleteEntryAlertDialog
        entry={entryToDelete}
        open={Boolean(entryToDelete)}
        onOpenChange={(open) => {
          if (!open) setEntryToDelete(null)
        }}
        onConfirm={() => {
          if (!entryToDelete) return
          void deleteEntry(entryToDelete.id).then(() => setEntryToDelete(null))
        }}
      />
    </section>
  )
}
