import { useEffect, useMemo, useRef, useState } from 'react'
import ActiveTimerBlock from '@/components/calendar/blocks/ActiveTimerBlock'
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
  getNowLinePosition,
  GRID_HEIGHT,
  HOURS,
  HOUR_HEIGHT,
  isSameDay,
  MINUTES_IN_DAY,
  MIN_ENTRY_HEIGHT,
  minutesToHeight,
  minutesToTop,
  startOfDay,
  TIME_COLUMN_WIDTH,
  toBlock,
} from '@/lib/calendar'
import { computeDuration } from '@/lib/utils'

function hideNativeDragImage(event) {
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

export default function WeekView({ weekStart, entries, activeEntry, entryTagsByEntryId = {} }) {
  const containerRef = useRef(null)
  const [editingEntry, setEditingEntry] = useState(null)
  const [draggingMove, setDraggingMove] = useState(null)
  const [previewBlock, setPreviewBlock] = useState(null)
  const [createDraft, setCreateDraft] = useState(null)
  const [pendingMove, setPendingMove] = useState(null)
  const [entryToDelete, setEntryToDelete] = useState(null)
  const [menuState, setMenuState] = useState({ open: false, entry: null, x: 0, y: 0 })
  const [mutationError, setMutationError] = useState('')
  const [now, setNow] = useState(() => new Date())
  const { elapsed } = useTimerContext()
  const { updateEntry, createEntry, deleteEntry } = useTimeEntryMutations({ entries })
  const isTouchViewport = useMediaQuery('(hover: none)')
  const minEntryHeight = isTouchViewport ? 28 : MIN_ENTRY_HEIGHT
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart])

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

  const blocksByDay = useMemo(() => {
    const map = {}

    weekDays.forEach((day) => {
      const dayKey = day.toDateString()
      const dayStart = startOfDay(day)
      const dayEnd = addDays(dayStart, 1)
      const dayBlocks = entriesForRendering
        .filter((entry) => entry.started_at && entry.stopped_at && isSameDay(new Date(entry.started_at), day))
        .map((entry) => toBlock(entry, dayStart, dayEnd, entry.duration_seconds ?? 0, minEntryHeight))
        .filter(Boolean)

      map[dayKey] = assignOverlapLanes(dayBlocks)
    })

    return map
  }, [entriesForRendering, minEntryHeight, weekDays])

  const activeTimerDayKey = useMemo(
    () => weekDays.find((day) => isSameDay(day, now))?.toDateString() ?? null,
    [weekDays, now]
  )

  const activeBlock = useMemo(() => {
    if (!activeEntry?.started_at || !activeTimerDayKey) {
      return null
    }

    const day = weekDays.find((candidate) => candidate.toDateString() === activeTimerDayKey)
    if (!day) {
      return null
    }

    const dayStart = startOfDay(day)
    const dayEnd = addDays(dayStart, 1)
    const activeStart = new Date(activeEntry.started_at)
    if (!isSameDay(activeStart, day)) {
      return null
    }

    return toBlock(activeEntry, dayStart, dayEnd, elapsed, minEntryHeight)
  }, [activeEntry, activeTimerDayKey, elapsed, minEntryHeight, weekDays])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date())
    }, 60_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const targetHour = Math.max(0, new Date().getHours() - 2)
    container.scrollTop = targetHour * HOUR_HEIGHT
  }, [])

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

  const moveEntryToDayTime = async (entry, day, targetMinutes) => {
    const durationSeconds = Math.max(
      60,
      entry.duration_seconds ?? computeDuration(entry.started_at, entry.stopped_at)
    )
    const targetDayStart = startOfDay(day)
    const startedAt = new Date(targetDayStart.getTime() + targetMinutes * 60_000)
    const stoppedAt = new Date(startedAt.getTime() + durationSeconds * 1000)
    await updateEntry(entry.id, {
      started_at: startedAt.toISOString(),
      stopped_at: stoppedAt.toISOString(),
      duration_seconds: durationSeconds,
    })
  }

  const duplicateEntry = async (entry) => {
    const durationSeconds = Math.max(
      60,
      entry.duration_seconds ?? computeDuration(entry.started_at, entry.stopped_at)
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

  const getRangeFromDraft = (startMinutes, currentMinutes) => {
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

  const updateMovePreview = (dayKey, clientY, containerRect) => {
    if (!draggingMove) {
      return { startMinutes: 0, durationMinutes: 0 }
    }
    const adjustedClientY = clientY - (draggingMove.grabOffsetMinutes / 60) * HOUR_HEIGHT
    const durationMinutes = draggingMove.durationMinutes
    const startMinutes = getDropStartMinutes(adjustedClientY, containerRect, durationMinutes)
    setPreviewBlock({
      dayKey,
      top: minutesToTop(startMinutes),
      height: minutesToHeight(durationMinutes, minEntryHeight),
      variant: 'move',
    })
    return { startMinutes, durationMinutes }
  }

  const updateCreatePreview = (dayKey, startMinutes, currentMinutes) => {
    const range = getRangeFromDraft(startMinutes, currentMinutes)
    setPreviewBlock({
      dayKey,
      top: minutesToTop(range.fromMinutes),
      height: minutesToHeight(range.durationMinutes, minEntryHeight),
      variant: 'create',
    })
    return range
  }

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) {
      return
    }

    try {
      setMutationError('')
      await deleteEntry(entryToDelete.id)
      setEntryToDelete(null)
    } catch (error) {
      setMutationError(error?.message ?? 'Unable to delete this entry.')
    }
  }

  return (
    <>
      {mutationError ? (
        <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {mutationError}
        </div>
      ) : null}
      <div ref={containerRef} className="rounded-2xl border border-border bg-card h-fit overflow-clip">
        <div className="min-w-[980px]">
          <div
            className="sticky top-0 z-30 grid border-b border-border bg-card"
            style={{ gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(7, minmax(0, 1fr))` }}
          >
            <div className="sticky left-0 z-40 border-r border-border bg-card" />
            {weekDays.map((day) => {
              const isToday = isSameDay(day, now)
              return (
                <div
                  key={day.toISOString()}
                  className="border-r border-border px-3 py-2 text-center last:border-r-0"
                >
                  <span className={
                    isToday
                      ? 'inline-block rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary'
                      : 'text-xs font-medium text-muted-foreground'
                  }>
                    {day.toLocaleDateString([], { weekday: 'short' })} {day.getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          <div
            className="grid"
            style={{ gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(7, minmax(0, 1fr))` }}
          >
            <div className="sticky left-0 z-20 border-r border-border bg-secondary/50" style={{ height: GRID_HEIGHT }}>
              {HOURS.map((hour) => (
                <div
                  key={`hour-${hour}`}
                  className="absolute inset-x-0 border-t border-border px-2 text-right font-mono text-xs text-muted-foreground/70"
                  style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT, lineHeight: '32px' }}
                >
                  {String(hour).padStart(2, '0')}
                </div>
              ))}
            </div>

            {weekDays.map((day) => {
              const dayKey = day.toDateString()
              const isToday = isSameDay(day, now)
              return (
                <div
                  key={`col-${dayKey}`}
                  className="relative border-r border-border last:border-r-0"
                  style={{ height: GRID_HEIGHT }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    const entry = (blocksByDay[dayKey] ?? []).find((block) => block.entry.id === draggingMove?.entryId)?.entry
                    if (!entry) {
                      return
                    }
                    const rect = event.currentTarget.getBoundingClientRect()
                    updateMovePreview(dayKey, event.clientY, rect)
                  }}
                  onDragLeave={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget)) {
                      return
                    }
                    if (!createDraft) {
                      setPreviewBlock(null)
                    }
                  }}
                  onDrop={async (event) => {
                    event.preventDefault()
                    const entry = (blocksByDay[dayKey] ?? []).find((block) => block.entry.id === draggingMove?.entryId)?.entry
                    setPreviewBlock(null)
                    if (!entry) {
                      setDraggingMove(null)
                      return
                    }

                    try {
                      setMutationError('')
                      const rect = event.currentTarget.getBoundingClientRect()
                      const { startMinutes: nextStartMinutes } = updateMovePreview(dayKey, event.clientY, rect)
                      const durationSeconds = Math.max(
                        60,
                        entry.duration_seconds ?? computeDuration(entry.started_at, entry.stopped_at)
                      )
                      const columnDayStart = startOfDay(day)
                      const startedAt = new Date(columnDayStart.getTime() + nextStartMinutes * 60_000)
                      const stoppedAt = new Date(startedAt.getTime() + durationSeconds * 1000)
                      setPendingMove({
                        entryId: entry.id,
                        startedAt: startedAt.toISOString(),
                        stoppedAt: stoppedAt.toISOString(),
                        startMs: startedAt.getTime(),
                        stopMs: stoppedAt.getTime(),
                        durationSeconds,
                      })
                      await moveEntryToDayTime(entry, day, nextStartMinutes)
                    } catch (error) {
                      setPendingMove(null)
                      setMutationError(error?.message ?? 'Unable to move this entry.')
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
                    const startMinutes = getDropStartMinutes(event.clientY, rect)
                    setCreateDraft({ day, dayKey, startMinutes, currentMinutes: startMinutes })
                    updateCreatePreview(dayKey, startMinutes, startMinutes)
                    event.currentTarget.setPointerCapture?.(event.pointerId)
                  }}
                  onPointerMove={(event) => {
                    if (!createDraft || createDraft.dayKey !== dayKey) {
                      return
                    }
                    const rect = event.currentTarget.getBoundingClientRect()
                    const currentMinutes = getDropStartMinutes(event.clientY, rect)
                    setCreateDraft((previous) =>
                      previous ? { ...previous, currentMinutes } : previous
                    )
                    updateCreatePreview(dayKey, createDraft.startMinutes, currentMinutes)
                  }}
                  onPointerUp={async (event) => {
                    if (!createDraft || createDraft.dayKey !== dayKey) {
                      return
                    }
                    event.currentTarget.releasePointerCapture?.(event.pointerId)
                    const range = getRangeFromDraft(createDraft.startMinutes, createDraft.currentMinutes)
                    setCreateDraft(null)
                    setPreviewBlock(null)

                    try {
                      setMutationError('')
                      const dayStart = startOfDay(day)
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
                      setMutationError(error?.message ?? 'Unable to create this entry.')
                    }
                  }}
                >
                  {HOURS.map((hour) => (
                    <div
                      key={`${dayKey}-line-${hour}`}
                      className="pointer-events-none absolute inset-x-0 border-t border-border/70"
                      style={{ top: hour * HOUR_HEIGHT }}
                    />
                  ))}

                  {previewBlock && previewBlock.dayKey === dayKey ? (
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

                  {(blocksByDay[dayKey] ?? []).map((block) => (
                    <EntryBlock
                      key={block.entry.id}
                      block={block}
                      tags={entryTagsByEntryId[block.entry.id] ?? []}
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
                          Math.round((entry.duration_seconds ?? computeDuration(entry.started_at, entry.stopped_at)) / 60)
                        )
                        const rawOffset = ((event.clientY - targetRect.top) / HOUR_HEIGHT) * 60
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

                  {activeBlock && activeTimerDayKey === dayKey ? (
                    <ActiveTimerBlock
                      block={activeBlock}
                      elapsed={elapsed}
                      onClick={() => setEditingEntry(activeBlock.entry)}
                    />
                  ) : null}

                  {isToday ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                      style={{ top: getNowLinePosition(now) }}
                    >
                      <span className="h-2 w-2 -translate-x-1 rounded-full bg-primary" />
                      <div className="flex-1 border-t border-primary" />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
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
        onClose={() => setMenuState({ open: false, entry: null, x: 0, y: 0 })}
        onEdit={(entry) => setEditingEntry(entry)}
        onDuplicate={async (entry) => {
          try {
            setMutationError('')
            await duplicateEntry(entry)
          } catch (error) {
            setMutationError(error?.message ?? 'Unable to duplicate this entry.')
          }
        }}
        onDelete={async (entry) => {
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
