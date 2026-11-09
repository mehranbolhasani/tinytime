import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ClockFace from '@/components/clock-calendar/ClockFace'
import EntryArc, { DraftArc, GoogleEntryArc } from '@/components/clock-calendar/EntryArc'
import PeriodToggle from '@/components/clock-calendar/PeriodToggle'
import { isSameDay, startOfDay } from '@/lib/calendar'
import {
  angleToMinutes,
  dateFromPeriodMinute,
  entriesToClockArcs,
  formatClockRange,
  googleEventsToClockArcs,
  MIN_ARC_MINUTES,
  MINUTES_IN_PERIOD,
  minutesToAngle,
  normalizeCreateRange,
  periodFromDate,
  pointerToAngle,
  snapMinutes,
  type ClockArc,
  type ClockPeriod,
  type DraftRange,
} from '@/lib/clockCalendar'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { NormalizedGoogleEvent, TimeEntry } from '@/types'

type DragMode =
  | { type: 'create'; originMinute: number }
  | { type: 'resize'; entryId: string; edge: 'start' | 'end'; otherMinute: number }
  | { type: 'move'; entryId: string; duration: number; grabOffset: number }

interface ClockDayCanvasProps {
  selectedDate: Date
  entries: TimeEntry[]
  activeEntry: TimeEntry | null
  liveElapsedSeconds?: number
  googleEvents?: NormalizedGoogleEvent[]
  period: ClockPeriod
  onPeriodChange: (period: ClockPeriod) => void
  rangeLabel?: string | null
  onSelectEntry?: (entry: TimeEntry) => void
  draft?: DraftRange | null
  draftLabel?: string
  onDraftChange?: (draft: DraftRange | null) => void
  onCommitMove?: (entry: TimeEntry, startedAt: string, stoppedAt: string) => Promise<void>
  interactive?: boolean
}

export default function ClockDayCanvas({
  selectedDate,
  entries,
  activeEntry,
  liveElapsedSeconds = 0,
  googleEvents = [],
  period,
  onPeriodChange,
  rangeLabel = null,
  onSelectEntry,
  draft = null,
  draftLabel = '',
  onDraftChange,
  onCommitMove,
  interactive = true,
}: ClockDayCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [now, setNow] = useState(() => new Date())
  const [size, setSize] = useState(360)
  const [drag, setDrag] = useState<DragMode | null>(null)
  const [faceSpin, setFaceSpin] = useState(0)
  const moveDidDragRef = useRef(false)
  const dragRef = useRef<DragMode | null>(null)
  const draftRef = useRef<DraftRange | null>(draft)
  const dayStart = useMemo(() => startOfDay(selectedDate), [selectedDate])
  const isToday = isSameDay(selectedDate, now)
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useEffect(() => {
    dragRef.current = drag
  }, [drag])

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    if (!isToday) return
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [isToday])

  useEffect(() => {
    const element = svgRef.current
    if (!element) return

    const update = () => {
      const width = element.clientWidth || 360
      setSize(width)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const arcs = useMemo(() => {
    const list = entriesToClockArcs(entries, dayStart, period, liveElapsedSeconds)
    if (activeEntry && !list.some((arc) => arc.entry.id === activeEntry.id)) {
      return list
    }
    return list
  }, [entries, dayStart, period, liveElapsedSeconds, activeEntry])

  const googleArcs = useMemo(
    () => googleEventsToClockArcs(googleEvents, dayStart, period),
    [googleEvents, dayStart, period]
  )

  const headerRange = useMemo(() => {
    if (rangeLabel) return rangeLabel
    if (draft) {
      const start = dateFromPeriodMinute(dayStart, period, draft.startMinute)
      const end = dateFromPeriodMinute(dayStart, period, draft.endMinute)
      return formatClockRange(start, end)
    }
    if (arcs.length === 0) return null
    const first = arcs[0]
    return formatClockRange(new Date(first.startMs), new Date(first.endMs))
  }, [rangeLabel, draft, dayStart, period, arcs])

  const getCenter = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) {
      return { x: size / 2, y: size / 2 }
    }
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }, [size])

  const minuteFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const center = getCenter()
      const angle = pointerToAngle(clientX, clientY, center.x, center.y)
      return snapMinutes(angleToMinutes(angle))
    },
    [getCenter]
  )

  const finishDrag = useCallback(async () => {
    const currentDrag = dragRef.current
    const currentDraft = draftRef.current
    if (!currentDrag) return

    if (currentDrag.type === 'move' && !moveDidDragRef.current) {
      const entry = entries.find((item) => item.id === currentDrag.entryId)
      onDraftChange?.(null)
      setDrag(null)
      setFaceSpin(0)
      if (entry) {
        onSelectEntry?.(entry)
      }
      return
    }

    if (
      (currentDrag.type === 'resize' || currentDrag.type === 'move') &&
      onCommitMove &&
      currentDraft
    ) {
      const entry = entries.find((item) => item.id === currentDrag.entryId)
      if (entry?.stopped_at) {
        const startedAt = dateFromPeriodMinute(dayStart, period, currentDraft.startMinute).toISOString()
        const stoppedAt = dateFromPeriodMinute(dayStart, period, currentDraft.endMinute).toISOString()
        await onCommitMove(entry, startedAt, stoppedAt)
      }
      onDraftChange?.(null)
    }

    setDrag(null)
    setFaceSpin(0)
  }, [dayStart, entries, onCommitMove, onDraftChange, onSelectEntry, period])

  useEffect(() => {
    if (!drag) return

    const onMove = (event: PointerEvent) => {
      const currentDrag = dragRef.current
      if (!currentDrag) return
      const minute = minuteFromPointer(event.clientX, event.clientY)

      if (!prefersReducedMotion && currentDrag.type === 'create') {
        setFaceSpin((minute - currentDrag.originMinute) * 0.15)
      }

      if (currentDrag.type === 'create' && onDraftChange) {
        onDraftChange(normalizeCreateRange(currentDrag.originMinute, minute))
        return
      }

      if (currentDrag.type === 'resize' && onDraftChange) {
        const startMinute = currentDrag.edge === 'start' ? minute : currentDrag.otherMinute
        const endMinute = currentDrag.edge === 'end' ? minute : currentDrag.otherMinute
        onDraftChange(normalizeCreateRange(startMinute, endMinute))
        return
      }

      if (currentDrag.type === 'move' && onDraftChange) {
        let startMinute = snapMinutes(minute - currentDrag.grabOffset)
        startMinute = Math.max(0, Math.min(MINUTES_IN_PERIOD - currentDrag.duration, startMinute))
        const next = {
          startMinute,
          endMinute: startMinute + currentDrag.duration,
        }
        const previous = draftRef.current
        if (
          previous &&
          (previous.startMinute !== next.startMinute || previous.endMinute !== next.endMinute)
        ) {
          moveDidDragRef.current = true
        }
        onDraftChange(next)
      }
    }

    const onUp = () => {
      void finishDrag()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [drag, finishDrag, minuteFromPointer, onDraftChange, prefersReducedMotion])

  const handleRingPointerDown = (event: React.PointerEvent) => {
    if (!interactive || !onDraftChange || drag) return
    if ((event.target as Element).closest('[role="button"]')) return

    const minute = minuteFromPointer(event.clientX, event.clientY)
    setDrag({ type: 'create', originMinute: minute })
    onDraftChange({ startMinute: minute, endMinute: Math.min(minute + 30, 720) })
  }

  const handleResizePointerDown = (
    edge: 'start' | 'end',
    arc: ClockArc,
    event: React.PointerEvent
  ) => {
    if (!interactive || !onCommitMove) return
    event.preventDefault()
    setDrag({
      type: 'resize',
      entryId: arc.entry.id,
      edge,
      otherMinute: edge === 'start' ? arc.endMinute : arc.startMinute,
    })
    onDraftChange?.({
      startMinute: arc.startMinute,
      endMinute: arc.endMinute,
    })
  }

  const handleMovePointerDown = (arc: ClockArc, event: React.PointerEvent) => {
    if (!interactive || !onCommitMove || !arc.entry.stopped_at) return
    event.preventDefault()
    const minute = minuteFromPointer(event.clientX, event.clientY)
    const duration = Math.max(arc.endMinute - arc.startMinute, MIN_ARC_MINUTES)
    moveDidDragRef.current = false
    setDrag({
      type: 'move',
      entryId: arc.entry.id,
      duration,
      grabOffset: minute - arc.startMinute,
    })
    onDraftChange?.({
      startMinute: arc.startMinute,
      endMinute: arc.endMinute,
    })
  }

  const cx = size / 2
  const cy = size / 2

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {headerRange ?? 'Select a time range'}
        </p>
        <PeriodToggle period={period} onChange={onPeriodChange} />
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-md">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size} ${size}`}
          className="h-full w-full touch-none select-none"
          role="img"
          aria-label={`Clock schedule for ${selectedDate.toLocaleDateString()}, ${period === 0 ? 'AM' : 'PM'}`}
          onPointerDown={handleRingPointerDown}
        >
          <ClockFace
            cx={cx}
            cy={cy}
            size={size}
            now={isToday && periodFromDate(now) === period ? now : null}
            showHands={isToday && periodFromDate(now) === period}
            faceRotationDeg={faceSpin}
          />

          {googleArcs.map((arc) => (
            <GoogleEntryArc key={arc.event.id} arc={arc} cx={cx} cy={cy} size={size} />
          ))}

          {arcs.map((arc) => (
            <EntryArc
              key={arc.entry.id}
              arc={arc}
              cx={cx}
              cy={cy}
              size={size}
              interactive={interactive}
              onSelect={(selected) => {
                if (drag) return
                onSelectEntry?.(selected.entry)
              }}
              onPointerDownBody={interactive ? handleMovePointerDown : undefined}
              onPointerDownHandle={interactive ? handleResizePointerDown : undefined}
            />
          ))}

          {draft ? (
            <DraftArc
              cx={cx}
              cy={cy}
              size={size}
              startAngle={minutesToAngle(draft.startMinute)}
              endAngle={minutesToAngle(Math.max(draft.endMinute - 0.001, draft.startMinute + 0.001))}
              label={draftLabel || undefined}
            />
          ) : null}
        </svg>
      </div>
    </div>
  )
}
