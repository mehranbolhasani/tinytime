import { useEffect, useMemo, useRef, useState } from 'react'
import ActiveTimerBlock from '@/components/calendar/blocks/ActiveTimerBlock'
import GoogleEventBlock from '@/components/calendar/blocks/GoogleEventBlock'
import DeleteEntryAlertDialog from '@/components/calendar/DeleteEntryAlertDialog'
import EntryBlock from '@/components/calendar/blocks/EntryBlock'
import EntryContextMenu from '@/components/calendar/EntryContextMenu'
import EntryEditDialog from '@/components/calendar/EntryEditDialog'
import { useTimerContext } from '@/contexts/TimerContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useTimeEntryMutations } from '@/hooks/useTimeEntries'
import {
  addDays,
  assignOverlapLanes,
  DEFAULT_CREATE_MINUTES,
  getDropStartMinutes,
  getGridHeight,
  getNowLinePosition,
  HOURS,
  isSameDay,
  MINUTES_IN_DAY,
  MIN_ENTRY_HEIGHT,
  minutesToHeight,
  minutesToTop,
  startOfDay,
  toBlock,
} from '@/lib/calendar'
import { computeDuration } from '@/lib/utils'
import type { CalendarBlock, NormalizedGoogleEvent, TimeEntry } from '@/types'

type GoogleCalendarBlock = CalendarBlock & { event: NormalizedGoogleEvent }

interface MenuState {
  open: boolean
  entry: TimeEntry
  x: number
  y: number
}

interface DraggingMove {
  entryId: string
  durationMinutes: number
  grabOffsetMinutes: number
}

interface PreviewBlock {
  top: number
  height: number
  variant: 'create' | 'move'
}

interface CreateDraft {
  startMinutes: number
  currentMinutes: number
}

interface PendingMove {
  entryId: string
  startedAt: string
  stoppedAt: string
  startMs: number
  stopMs: number
  durationSeconds: number
}

function hideNativeDragImage(event: React.DragEvent): void {
  const ghost = document.createElement('div')
  ghost.style.position = 'fixed'
  ghost.style.top = '-9999px'
  ghost.style.left = '-9999px'
  ghost.style.width = '1px'
  ghost.style.height = '1px'
  document.body.appendChild(ghost)
  event.dataTransfer.setDragImage(ghost, 0, 0)
  requestAnimationFrame(() => {
    document.body.removeChild(ghost)
  })
}

interface DayViewProps {
  selectedDate: Date
  entries: TimeEntry[]
  activeEntry: TimeEntry | null
  googleEvents?: NormalizedGoogleEvent[]
  isLoadingGoogleEvents?: boolean
  hourHeight?: number
  viewportHeight?: string
}

export default function DayView({
  selectedDate,
  entries,
  activeEntry,
  googleEvents = [],
  isLoadingGoogleEvents = false,
  hourHeight = 32,
  viewportHeight = 'clamp(420px, 70dvh, 720px)',
}: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [draggingMove, setDraggingMove] = useState<DraggingMove | null>(null)
  const [previewBlock, setPreviewBlock] = useState<PreviewBlock | null>(null)
  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<TimeEntry | null>(null)
  const [menuState, setMenuState] = useState<MenuState | null>(null)
  const [mutationError, setMutationError] = useState('')
  const [now, setNow] = useState(() => new Date())
  const { elapsed, isRunning, start: startTimer } = useTimerContext()
  const { updateEntry, createEntry, deleteEntry } = useTimeEntryMutations({ entries })
  const isTouchViewport = useMediaQuery('(hover: none)')
  const minEntryHeight = isTouchViewport ? 28 : MIN_ENTRY_HEIGHT
  const gridHeight = getGridHeight(hourHeight)
  const dayStart = useMemo(() => startOfDay(selectedDate), [selectedDate])
  const dayEnd = useMemo(() => addDays(dayStart, 1), [dayStart])
  const isSelectedToday = isSameDay(selectedDate, now)

  const entriesForRendering = useMemo(() => {
    if (!pendingMove) {
      return entries
    }

    return entries.map((entry) =>
      entry.id === pendingMove.entryId
        ? {
            ...entry,
            started_at: pendingMove.startedAt,
            stopped_at: pendingMove.stoppedAt,
            duration_seconds: pendingMove.durationSeconds,
          }
        : entry
    )
  }, [entries, pendingMove])

  const completedBlocks = useMemo(() => {
    const blocks = entriesForRendering
      .filter((entry) => entry.started_at && entry.stopped_at)
      .map((entry) => toBlock(entry, dayStart, dayEnd, entry.duration_seconds ?? 0, minEntryHeight, hourHeight))
      .filter((b): b is CalendarBlock => b !== null)

    return assignOverlapLanes(blocks)
  }, [entriesForRendering, dayStart, dayEnd, minEntryHeight, hourHeight])

  const { timedGoogleEvents, allDayGoogleEvents } = useMemo(() => {
    const timed: NormalizedGoogleEvent[] = []
    const allDay: NormalizedGoogleEvent[] = []

    googleEvents.forEach((event) => {
      if (event.isAllDay) {
        allDay.push(event)
      } else {
        timed.push(event)
      }
    })

    return { timedGoogleEvents: timed, allDayGoogleEvents: allDay }
  }, [googleEvents])

  const googleBlocks = useMemo(() => {
    const blocks = timedGoogleEvents
      .map((event) => {
        const block = toBlock(
          { started_at: event.startedAt, stopped_at: event.stoppedAt } as unknown as TimeEntry,
          dayStart,
          dayEnd,
          0,
          minEntryHeight,
          hourHeight
        )

        if (!block) {
          return null
        }

        return { ...block, event } as GoogleCalendarBlock
      })
      .filter((b): b is GoogleCalendarBlock => b !== null)

    return assignOverlapLanes(blocks)
  }, [dayEnd, dayStart, minEntryHeight, timedGoogleEvents, hourHeight])

  const activeBlock = useMemo(() => {
    if (!activeEntry?.started_at) {
      return null
    }
    const startedAt = new Date(activeEntry.started_at)
    if (!isSameDay(startedAt, dayStart)) {
      return null
    }

    return toBlock(activeEntry, dayStart, dayEnd, elapsed, minEntryHeight, hourHeight)
  }, [activeEntry, dayStart, dayEnd, elapsed, minEntryHeight, hourHeight])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date())
    }, 60_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) {
      return
    }

    const targetHour = Math.max(0, new Date().getHours() - 2)
    container.scrollTop = targetHour * hourHeight
  }, [hourHeight])

  useEffect(() => {
    if (!pendingMove) {
      return
    }

    const matched = entries.some((entry) => {
      if (entry.id !== pendingMove.entryId || !entry.started_at || !entry.stopped_at) {
        return false
      }
      const startMs = new Date(entry.started_at).getTime()
      const stopMs = new Date(entry.stopped_at).getTime()
      return startMs === pendingMove.startMs && stopMs === pendingMove.stopMs
    })

    if (matched) {
      setPendingMove(null)
    }
  }, [entries, pendingMove])

  const moveEntryToTime = async (entry: TimeEntry, targetMinutes: number): Promise<void> => {
    const durationSeconds = Math.max(
      60,
      entry.duration_seconds ?? (entry.stopped_at ? computeDuration(entry.started_at, entry.stopped_at) : 0)
    )
    const startedAt = new Date(dayStart.getTime() + targetMinutes * 60_000)
    const stoppedAt = new Date(startedAt.getTime() + durationSeconds * 1000)
    await updateEntry(entry.id, {
      started_at: startedAt.toISOString(),
      stopped_at: stoppedAt.toISOString(),
      duration_seconds: durationSeconds,
    })
  }

  const duplicateEntry = async (entry: TimeEntry): Promise<void> => {
    const durationSeconds = Math.max(
      60,
      entry.duration_seconds ?? (entry.stopped_at ? computeDuration(entry.started_at, entry.stopped_at) : 0)
    )
    const startedAt = new Date(entry.started_at)
    const stoppedAt = new Date(startedAt.getTime() + durationSeconds * 1000)
    await createEntry({
      project_id: entry.project_id,
      description: entry.description ?? '',
      started_at: startedAt.toISOString(),
      stopped_at: stoppedAt.toISOString(),
      duration_seconds: durationSeconds,
    })
  }

  const getRangeFromDraft = (
    startMinutes: number,
    currentMinutes: number
  ): { fromMinutes: number; toMinutes: number; durationMinutes: number } => {
    let fromMinutes = Math.min(startMinutes, currentMinutes)
    let toMinutes = Math.max(startMinutes, currentMinutes)

    if (fromMinutes === toMinutes) {
      toMinutes = Math.min(MINUTES_IN_DAY, fromMinutes + DEFAULT_CREATE_MINUTES)
      if (toMinutes === fromMinutes) {
        fromMinutes = Math.max(0, fromMinutes - DEFAULT_CREATE_MINUTES)
      }
    }

    return {
      fromMinutes,
      toMinutes,
      durationMinutes: Math.max(1, toMinutes - fromMinutes),
    }
  }

  const updateMovePreview = (
    clientY: number,
    containerRect: DOMRect
  ): { startMinutes: number; durationMinutes: number } => {
    if (!draggingMove) {
      return { startMinutes: 0, durationMinutes: 0 }
    }
    const adjustedClientY = clientY - (draggingMove.grabOffsetMinutes / 60) * hourHeight
    const durationMinutes = draggingMove.durationMinutes
    const startMinutes = getDropStartMinutes(adjustedClientY, containerRect, durationMinutes, hourHeight)
    setPreviewBlock({
      top: minutesToTop(startMinutes, hourHeight),
      height: minutesToHeight(durationMinutes, minEntryHeight, hourHeight),
      variant: 'move',
    })
    return { startMinutes, durationMinutes }
  }

  const updateCreatePreview = (
    startMinutes: number,
    currentMinutes: number
  ): { fromMinutes: number; toMinutes: number; durationMinutes: number } => {
    const range = getRangeFromDraft(startMinutes, currentMinutes)
    setPreviewBlock({
      top: minutesToTop(range.fromMinutes, hourHeight),
      height: minutesToHeight(range.durationMinutes, minEntryHeight, hourHeight),
      variant: 'create',
    })
    return range
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!entryToDelete) {
      return
    }

    try {
      setMutationError('')
      await deleteEntry(entryToDelete.id)
      setEntryToDelete(null)
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to delete this entry.')
    }
  }

  const handleStartFromGoogleEvent = async (event: NormalizedGoogleEvent): Promise<void> => {
    if (isRunning) {
      setMutationError('Stop the active timer before starting one from a Google event.')
      return
    }

    const eventStart = new Date(event.startedAt)
    const eventStop = new Date(event.stoppedAt)
    const nowDate = new Date()

    if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventStop.getTime())) {
      setMutationError('Unable to start timer from an event with invalid dates.')
      return
    }

    try {
      setMutationError('')

      if (eventStop.getTime() > nowDate.getTime()) {
        const created = await createEntry({
          project_id: null,
          description: event.title ?? '',
          started_at: nowDate.toISOString(),
          stopped_at: null,
          duration_seconds: null,
        })
        startTimer(created)
        return
      }

      const durationSeconds = Math.max(60, Math.round((eventStop.getTime() - eventStart.getTime()) / 1000))

      await createEntry({
        project_id: null,
        description: event.title ?? '',
        started_at: eventStart.toISOString(),
        stopped_at: eventStop.toISOString(),
        duration_seconds: durationSeconds,
      })
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to create a timer entry from this event.')
    }
  }

  return (
    <>
      {mutationError ? (
        <div role="alert" className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {mutationError}
        </div>
      ) : null}
      <div
        ref={scrollRef}
        className="overflow-y-auto overflow-x-hidden rounded-xl bg-card"
        style={{ height: viewportHeight }}
      >
        {allDayGoogleEvents.length > 0 ? (
          <div role="group" aria-label="All-day events" className="border-b border-border bg-secondary/40 px-3 py-2">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">All-day events</p>
            <div className="flex flex-wrap gap-1.5">
              {allDayGoogleEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => handleStartFromGoogleEvent(event)}
                  disabled={isRunning}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: event.calendarColor }} />
                  <span className="max-w-[180px] truncate">{event.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-[56px_1fr]">
          <div className="relative border-r border-border bg-secondary/50" style={{ height: gridHeight }}>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute inset-x-0 border-t border-border px-2 text-right font-mono text-xs text-muted-foreground/70"
                style={{ top: hour * hourHeight, height: hourHeight, lineHeight: `${hourHeight}px` }}
              >
                {String(hour).padStart(2, '0')}
              </div>
            ))}
          </div>

          <div
            className="relative"
            style={{ height: gridHeight }}
            onDragOver={(event) => {
              event.preventDefault()
              const entry = completedBlocks.find((block) => block.entry.id === draggingMove?.entryId)?.entry
              if (!entry) {
                return
              }
              const rect = event.currentTarget.getBoundingClientRect()
              updateMovePreview(event.clientY, rect)
            }}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                return
              }
              if (!createDraft) {
                setPreviewBlock(null)
              }
            }}
            onDrop={async (event) => {
              event.preventDefault()
              const entry = completedBlocks.find((block) => block.entry.id === draggingMove?.entryId)?.entry
              setPreviewBlock(null)
              if (!entry) {
                setDraggingMove(null)
                return
              }

              try {
                setMutationError('')
                const rect = event.currentTarget.getBoundingClientRect()
                const { startMinutes: nextStartMinutes } = updateMovePreview(event.clientY, rect)
                const durationSeconds = Math.max(
                  60,
                  entry.duration_seconds ?? (entry.stopped_at ? computeDuration(entry.started_at, entry.stopped_at) : 0)
                )
                const startedAt = new Date(dayStart.getTime() + nextStartMinutes * 60_000)
                const stoppedAt = new Date(startedAt.getTime() + durationSeconds * 1000)
                setPendingMove({
                  entryId: entry.id,
                  startedAt: startedAt.toISOString(),
                  stoppedAt: stoppedAt.toISOString(),
                  startMs: startedAt.getTime(),
                  stopMs: stoppedAt.getTime(),
                  durationSeconds,
                })
                await moveEntryToTime(entry, nextStartMinutes)
              } catch (error) {
                setPendingMove(null)
                setMutationError(error instanceof Error ? error.message : 'Unable to move this entry.')
              } finally {
                setDraggingMove(null)
              }
            }}
            onPointerDown={(event) => {
              if (event.button !== 0 || draggingMove) {
                return
              }
              const target = event.target
              if (target instanceof Element && target.closest('[data-entry-block]')) {
                return
              }
              const rect = event.currentTarget.getBoundingClientRect()
              const startMinutes = getDropStartMinutes(event.clientY, rect, 0, hourHeight)
              setCreateDraft({ startMinutes, currentMinutes: startMinutes })
              updateCreatePreview(startMinutes, startMinutes)
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={(event) => {
              if (!createDraft) {
                return
              }
              const rect = event.currentTarget.getBoundingClientRect()
              const currentMinutes = getDropStartMinutes(event.clientY, rect, 0, hourHeight)
              setCreateDraft((previous) => (previous ? { ...previous, currentMinutes } : previous))
              updateCreatePreview(createDraft.startMinutes, currentMinutes)
            }}
            onPointerUp={async (event) => {
              if (!createDraft) {
                return
              }
              event.currentTarget.releasePointerCapture(event.pointerId)
              const range = getRangeFromDraft(createDraft.startMinutes, createDraft.currentMinutes)
              setCreateDraft(null)
              setPreviewBlock(null)
              try {
                setMutationError('')
                const startedAt = new Date(dayStart.getTime() + range.fromMinutes * 60_000)
                const stoppedAt = new Date(dayStart.getTime() + range.toMinutes * 60_000)
                const created = await createEntry({
                  project_id: null,
                  description: '',
                  started_at: startedAt.toISOString(),
                  stopped_at: stoppedAt.toISOString(),
                  duration_seconds: Math.round((stoppedAt.getTime() - startedAt.getTime()) / 1000),
                })
                setEditingEntry(created)
              } catch (error) {
                setMutationError(error instanceof Error ? error.message : 'Unable to create this entry.')
              }
            }}
          >
            {HOURS.map((hour) => (
              <div
                key={`line-${hour}`}
                className="pointer-events-none absolute inset-x-0 border-t border-border/70"
                style={{ top: hour * hourHeight }}
              />
            ))}

            {previewBlock ? (
              <div
                className={
                  previewBlock.variant === 'create'
                    ? 'pointer-events-none absolute inset-x-3 z-20 rounded-lg border border-primary/60 bg-primary/15'
                    : 'pointer-events-none absolute inset-x-3 z-20 rounded-lg border border-dashed border-primary/70 bg-primary/10'
                }
                style={{
                  top: previewBlock.top,
                  height: previewBlock.height,
                }}
              />
            ) : null}

            {googleBlocks.map((block) => (
              <GoogleEventBlock
                key={`google-${block.event.id}-${block.startMs}`}
                block={block}
                event={block.event}
                onStartTimer={handleStartFromGoogleEvent}
                disableStart={isRunning}
              />
            ))}

            {completedBlocks.map((block) => (
              <EntryBlock
                key={block.entry.id}
                block={block}
                isDragging={draggingMove?.entryId === block.entry.id}
                onClick={() => {
                  setEditingEntry(block.entry)
                }}
                onContextMenu={(event) => {
                  event.preventDefault()
                  setMenuState({
                    open: true,
                    entry: block.entry,
                    x: event.clientX,
                    y: event.clientY,
                  })
                }}
                onDragStart={(event, entry) => {
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', entry.id)
                  hideNativeDragImage(event)
                  const targetRect = event.currentTarget.getBoundingClientRect()
                  const durationMinutes = Math.max(
                    1,
                    Math.round((entry.duration_seconds ?? (entry.stopped_at ? computeDuration(entry.started_at, entry.stopped_at) : 0)) / 60)
                  )
                  const rawOffset = ((event.clientY - targetRect.top) / hourHeight) * 60
                  const grabOffsetMinutes = Math.max(0, Math.min(durationMinutes, rawOffset))
                  setDraggingMove({
                    entryId: entry.id,
                    durationMinutes,
                    grabOffsetMinutes,
                  })
                }}
                onDragEnd={() => {
                  setDraggingMove(null)
                  setPreviewBlock(null)
                }}
              />
            ))}

            {activeBlock ? (
              <ActiveTimerBlock
                block={activeBlock}
                elapsed={elapsed}
                onClick={() => setEditingEntry(activeBlock.entry)}
              />
            ) : null}

            {isSelectedToday ? (
              <div
                className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                style={{ top: getNowLinePosition(now, hourHeight) }}
              >
                <span className="h-2 w-2 -translate-x-1 rounded-full bg-primary" />
                <div className="flex-1 border-t border-primary" />
              </div>
            ) : null}
          </div>
        </div>
        {isLoadingGoogleEvents ? (
          <div className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">Loading Google events...</div>
        ) : null}
      </div>

      <EntryEditDialog
        entry={editingEntry}
        open={Boolean(editingEntry)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingEntry(null)
          }
        }}
      />
      <EntryContextMenu
        menuState={menuState}
        onClose={() => setMenuState(null)}
        onEdit={(entry) => setEditingEntry(entry)}
        onDuplicate={async (entry) => {
          try {
            setMutationError('')
            await duplicateEntry(entry)
          } catch (error) {
            setMutationError(error instanceof Error ? error.message : 'Unable to duplicate this entry.')
          }
        }}
        onDelete={(entry) => {
          setEntryToDelete(entry)
        }}
      />
      <DeleteEntryAlertDialog
        open={Boolean(entryToDelete)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEntryToDelete(null)
          }
        }}
        entry={entryToDelete}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}
