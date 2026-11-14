import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { usePendingEntryOverride } from '@/hooks/usePendingEntryOverride'
import type { useTimeEntryMutations } from '@/hooks/useTimeEntries'
import {
  entryDurationSeconds,
  getDraftRange,
  getDropStartMinutes,
  minutesToHeight,
  minutesToTop,
} from '@/lib/calendar'
import type { TimeEntry } from '@/types'

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

type EntryMutations = ReturnType<typeof useTimeEntryMutations>

interface UseDayViewDragOptions {
  entries: TimeEntry[]
  dayStart: Date
  hourHeight: number
  minEntryHeight: number
  /** Previous day's data is on screen: no drags or creates until it lands. */
  isStale?: boolean
  updateEntry: EntryMutations['updateEntry']
  createEntry: EntryMutations['createEntry']
  onCreated: (entry: TimeEntry) => void
  onError: (message: string) => void
  clearError: () => void
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

export function useDayViewDrag({
  entries,
  dayStart,
  hourHeight,
  minEntryHeight,
  isStale = false,
  updateEntry,
  createEntry,
  onCreated,
  onError,
  clearError,
}: UseDayViewDragOptions) {
  const [draggingMove, setDraggingMove] = useState<DraggingMove | null>(null)
  const [previewBlock, setPreviewBlock] = useState<PreviewBlock | null>(null)
  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null)
  const [awaitingCreated, setAwaitingCreated] = useState<TimeEntry | null>(null)
  const [prevDayStart, setPrevDayStart] = useState(dayStart)
  const { entriesForRendering, setOverride, clearOverride } = usePendingEntryOverride(entries)
  const draggingEntryId = draggingMove?.entryId ?? null

  // A row created on a day the user has left will never show up in this day's
  // `entries`, so drop the pending preview instead of blocking new drags forever.
  if (dayStart.getTime() !== prevDayStart.getTime()) {
    setPrevDayStart(dayStart)
    setAwaitingCreated(null)
    setCreateDraft(null)
    setPreviewBlock(null)
  }

  // Keep the create preview on screen until the new row is actually in the cache,
  // then hand it over to the real block and open the edit dialog.
  useLayoutEffect(() => {
    if (!awaitingCreated) {
      return
    }

    if (entries.some((entry) => entry.id === awaitingCreated.id)) {
      setPreviewBlock(null)
      setAwaitingCreated(null)
      onCreated(awaitingCreated)
    }
  }, [awaitingCreated, entries, onCreated])

  const updateMovePreview = useCallback(
    (clientY: number, containerRect: DOMRect): { startMinutes: number; durationMinutes: number } => {
      if (!draggingMove) {
        return { startMinutes: 0, durationMinutes: 0 }
      }
      const adjustedClientY = clientY - (draggingMove.grabOffsetMinutes / 60) * hourHeight
      const durationMinutes = draggingMove.durationMinutes
      const startMinutes = getDropStartMinutes(adjustedClientY, containerRect, durationMinutes, hourHeight)
      const top = minutesToTop(startMinutes, hourHeight)
      const height = minutesToHeight(durationMinutes, minEntryHeight, hourHeight)
      // dragover fires continuously; only touch state when the snapped cell moves.
      setPreviewBlock((prev) =>
        prev && prev.top === top && prev.height === height && prev.variant === 'move'
          ? prev
          : { top, height, variant: 'move' }
      )
      return { startMinutes, durationMinutes }
    },
    [draggingMove, hourHeight, minEntryHeight]
  )

  const updateCreatePreview = useCallback(
    (
      startMinutes: number,
      currentMinutes: number
    ): { fromMinutes: number; toMinutes: number; durationMinutes: number } => {
      const range = getDraftRange(startMinutes, currentMinutes)
      const top = minutesToTop(range.fromMinutes, hourHeight)
      const height = minutesToHeight(range.durationMinutes, minEntryHeight, hourHeight)
      setPreviewBlock((prev) =>
        prev && prev.top === top && prev.height === height && prev.variant === 'create'
          ? prev
          : { top, height, variant: 'create' }
      )
      return range
    },
    [hourHeight, minEntryHeight]
  )

  const moveEntryToTime = useCallback(
    async (entry: TimeEntry, targetMinutes: number): Promise<void> => {
      const durationSeconds = Math.max(60, entryDurationSeconds(entry))
      const startedAt = new Date(dayStart.getTime() + targetMinutes * 60_000)
      const stoppedAt = new Date(startedAt.getTime() + durationSeconds * 1000)
      await updateEntry(entry.id, {
        started_at: startedAt.toISOString(),
        stopped_at: stoppedAt.toISOString(),
        duration_seconds: durationSeconds,
      })
    },
    [dayStart, updateEntry]
  )

  const handleBlockDragStart = useCallback(
    (event: React.DragEvent, entry: TimeEntry) => {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', entry.id)
      hideNativeDragImage(event)
      const targetRect = event.currentTarget.getBoundingClientRect()
      const durationMinutes = Math.max(1, Math.round(entryDurationSeconds(entry) / 60))
      const rawOffset = ((event.clientY - targetRect.top) / hourHeight) * 60
      const grabOffsetMinutes = Math.max(0, Math.min(durationMinutes, rawOffset))
      setDraggingMove({
        entryId: entry.id,
        durationMinutes,
        grabOffsetMinutes,
      })
    },
    [hourHeight]
  )

  const handleBlockDragEnd = useCallback(() => {
    setDraggingMove(null)
    setPreviewBlock(null)
  }, [])

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const entry = entriesForRendering.find((item) => item.id === draggingEntryId)
      if (!entry) {
        return
      }
      const rect = event.currentTarget.getBoundingClientRect()
      updateMovePreview(event.clientY, rect)
    },
    [draggingEntryId, entriesForRendering, updateMovePreview]
  )

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return
      }
      if (!createDraft) {
        setPreviewBlock(null)
      }
    },
    [createDraft]
  )

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const entry = entriesForRendering.find((item) => item.id === draggingEntryId)
      setPreviewBlock(null)
      if (!entry) {
        setDraggingMove(null)
        return
      }

      try {
        clearError()
        const rect = event.currentTarget.getBoundingClientRect()
        const { startMinutes: nextStartMinutes } = updateMovePreview(event.clientY, rect)
        const durationSeconds = Math.max(60, entryDurationSeconds(entry))
        const startedAt = new Date(dayStart.getTime() + nextStartMinutes * 60_000)
        const stoppedAt = new Date(startedAt.getTime() + durationSeconds * 1000)
        setOverride({
          entryId: entry.id,
          startedAt: startedAt.toISOString(),
          stoppedAt: stoppedAt.toISOString(),
          durationSeconds,
        })
        await moveEntryToTime(entry, nextStartMinutes)
      } catch (error) {
        clearOverride()
        onError(error instanceof Error ? error.message : 'Unable to move this entry.')
      } finally {
        setDraggingMove(null)
      }
    },
    [
      clearError,
      clearOverride,
      dayStart,
      draggingEntryId,
      entriesForRendering,
      moveEntryToTime,
      onError,
      setOverride,
      updateMovePreview,
    ]
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (
        isStale ||
        event.pointerType === 'touch' ||
        event.button !== 0 ||
        draggingMove ||
        awaitingCreated
      ) {
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
    },
    [awaitingCreated, draggingMove, hourHeight, isStale, updateCreatePreview]
  )

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!createDraft) {
        return
      }
      event.currentTarget.releasePointerCapture?.(event.pointerId)
      setCreateDraft(null)
      setPreviewBlock(null)
    },
    [createDraft]
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!createDraft) {
        return
      }
      const rect = event.currentTarget.getBoundingClientRect()
      const currentMinutes = getDropStartMinutes(event.clientY, rect, 0, hourHeight)
      if (currentMinutes === createDraft.currentMinutes) {
        return
      }
      setCreateDraft((previous) =>
        previous && previous.currentMinutes !== currentMinutes
          ? { ...previous, currentMinutes }
          : previous
      )
      updateCreatePreview(createDraft.startMinutes, currentMinutes)
    },
    [createDraft, hourHeight, updateCreatePreview]
  )

  const handlePointerUp = useCallback(
    async (event: React.PointerEvent<HTMLDivElement>) => {
      if (!createDraft) {
        return
      }
      event.currentTarget.releasePointerCapture(event.pointerId)
      const range = getDraftRange(createDraft.startMinutes, createDraft.currentMinutes)
      setCreateDraft(null)
      try {
        clearError()
        const startedAt = new Date(dayStart.getTime() + range.fromMinutes * 60_000)
        const stoppedAt = new Date(dayStart.getTime() + range.toMinutes * 60_000)
        const created = await createEntry({
          project_id: null,
          description: '',
          started_at: startedAt.toISOString(),
          stopped_at: stoppedAt.toISOString(),
          duration_seconds: Math.round((stoppedAt.getTime() - startedAt.getTime()) / 1000),
        })
        // The preview block stays up until the effect above sees this row in the cache.
        setAwaitingCreated(created)
      } catch (error) {
        setPreviewBlock(null)
        onError(error instanceof Error ? error.message : 'Unable to create this entry.')
      }
    },
    [clearError, createDraft, createEntry, dayStart, onError]
  )

  const blockDragHandlers = useMemo(
    () => ({
      onDragStart: handleBlockDragStart,
      onDragEnd: handleBlockDragEnd,
    }),
    [handleBlockDragEnd, handleBlockDragStart]
  )

  const gridHandlers = useMemo(
    () => ({
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    }),
    [
      handleDragLeave,
      handleDragOver,
      handleDrop,
      handlePointerCancel,
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
    ]
  )

  return {
    entriesForRendering,
    previewBlock,
    draggingEntryId,
    blockDragHandlers,
    gridHandlers,
  }
}
