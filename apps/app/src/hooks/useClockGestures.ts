import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import {
  DIAL,
  MINUTES_IN_DAY,
  MIN_BLOCK_MINUTES,
  advanceSweep,
  clamp,
  normalizeRange,
  pointerAngle,
  pointerRadiusFraction,
  snapMinute,
  startSweep,
  type DialArc,
  type SweepState,
} from '@/lib/clockCalendar'
import type { TimeEntry } from '@/types'

interface MinuteRange {
  startMinute: number
  endMinute: number
}

interface GestureBase {
  /** Captured at pointerdown; the dial no longer moves during a gesture. */
  rect: DOMRect
  sweep: SweepState
  moved: boolean
  startX: number
  startY: number
}

type Gesture =
  | (GestureBase & { kind: 'create' })
  | (GestureBase & { kind: 'move'; arc: DialArc; duration: number })
  | (GestureBase & { kind: 'resize'; arc: DialArc; edge: 'start' | 'end' })


type ArcPart = 'body' | 'start' | 'end'

interface UseClockGesturesOptions {
  dayStart: Date
  arcs: DialArc[]
  maxMinute: number
  svgRef: React.RefObject<SVGSVGElement | null>
  binRef: React.RefObject<HTMLElement | null>
  onCreateDraft: (range: MinuteRange) => void
  onCommitMove: (entry: TimeEntry, startMinute: number, endMinute: number) => void
  onRequestDelete: (entry: TimeEntry) => void
  onActivate: (arc: DialArc) => void
  onPointerPosition?: (x: number, y: number) => void
}

interface UseClockGesturesResult {
  draft: MinuteRange | null
  draftColor: string
  hiddenEntryId: string | null
  isMoving: boolean
  isOverBin: boolean
  isDetached: boolean
  onTrackPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void
  onArcPointerDown: (arc: DialArc, part: ArcPart, event: React.PointerEvent) => void
}

function sameRange(a: MinuteRange | null, b: MinuteRange | null): boolean {
  if (!a || !b) {
    return a === b
  }
  return a.startMinute === b.startMinute && a.endMinute === b.endMinute
}

function moveRange(arc: DialArc, accumulated: number, maxMinute: number): MinuteRange {
  const duration = Math.max(MIN_BLOCK_MINUTES, arc.endMinute - arc.startMinute)
  const maxStart = Math.max(0, Math.min(maxMinute, MINUTES_IN_DAY) - duration)
  const startMinute = clamp(snapMinute(arc.startMinute + accumulated), 0, maxStart)
  return { startMinute, endMinute: startMinute + duration }
}

function resizeRange(
  arc: DialArc,
  edge: 'start' | 'end',
  accumulated: number,
  maxMinute: number
): MinuteRange {
  if (edge === 'start') {
    const startMinute = clamp(
      snapMinute(arc.startMinute + accumulated),
      0,
      Math.max(0, arc.endMinute - MIN_BLOCK_MINUTES)
    )
    return { startMinute, endMinute: arc.endMinute }
  }

  const minEnd = Math.min(MINUTES_IN_DAY, arc.startMinute + MIN_BLOCK_MINUTES)
  const maxEnd = Math.max(minEnd, Math.min(maxMinute, MINUTES_IN_DAY))
  const endMinute = clamp(snapMinute(arc.endMinute + accumulated), minEnd, maxEnd)
  return { startMinute: arc.startMinute, endMinute }
}

export function useClockGestures({
  maxMinute,
  svgRef,
  binRef,
  onCreateDraft,
  onCommitMove,
  onRequestDelete,
  onActivate,
  onPointerPosition,
}: UseClockGesturesOptions): UseClockGesturesResult {
  const gestureRef = useRef<Gesture | null>(null)
  const detachedRef = useRef(false)
  const movingRef = useRef(false)
  const overBinRef = useRef(false)
  const hiddenRef = useRef<string | null>(null)
  const colorRef = useRef('#eab308')
  const frameRef = useRef<number | null>(null)
  const latestRef = useRef<PointerEvent | null>(null)
  const [draft, setDraft] = useState<MinuteRange | null>(null)
  const [draftColor, setDraftColor] = useState('#eab308')
  const [hiddenEntryId, setHiddenEntryId] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const [isOverBin, setIsOverBin] = useState(false)
  const [isDetached, setIsDetached] = useState(false)

  // Only touch state when the value actually changes: pointer moves fire far more
  // often than the derived flags change, and each setState re-renders the dial.
  const syncDetached = (next: boolean) => {
    if (detachedRef.current === next) return
    detachedRef.current = next
    setIsDetached(next)
  }
  const syncMoving = (next: boolean) => {
    if (movingRef.current === next) return
    movingRef.current = next
    setIsMoving(next)
  }
  const syncOverBin = (next: boolean) => {
    if (overBinRef.current === next) return
    overBinRef.current = next
    setIsOverBin(next)
  }
  const syncHidden = (next: string | null) => {
    if (hiddenRef.current === next) return
    hiddenRef.current = next
    setHiddenEntryId(next)
  }
  const syncColor = (next: string) => {
    if (colorRef.current === next) return
    colorRef.current = next
    setDraftColor(next)
  }

  const reset = useCallback(() => {
    gestureRef.current = null
    detachedRef.current = false
    movingRef.current = false
    overBinRef.current = false
    hiddenRef.current = null
    colorRef.current = '#eab308'
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    latestRef.current = null
    setDraft(null)
    setHiddenEntryId(null)
    setIsMoving(false)
    setIsOverBin(false)
    setIsDetached(false)
  }, [])

  const pointOverBin = (x: number, y: number): boolean => {
    const element = binRef.current
    if (!element) {
      return false
    }
    const rect = element.getBoundingClientRect()
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }

  const handleMove = useEffectEvent((event: PointerEvent) => {
    const gesture = gestureRef.current
    if (!gesture) {
      return
    }

    onPointerPosition?.(event.clientX, event.clientY)

    if (
      !gesture.moved &&
      Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < 6
    ) {
      return
    }

    const rect = gesture.rect
    if (!rect.width) {
      return
    }

    const angle = pointerAngle(event.clientX, event.clientY, rect)

    if (gesture.kind === 'create') {
      syncDetached(false)
      const sweep = advanceSweep(gesture.sweep, angle)
      gestureRef.current = { ...gesture, sweep, moved: true }
      const position = clamp(sweep.originMinute + sweep.accumulated, 0, maxMinute)
      const range = normalizeRange(sweep.originMinute, position, maxMinute)
      setDraft((previous) => (sameRange(previous, range) ? previous : range))
      syncColor('#eab308')
      return
    }

    if (gesture.kind === 'resize') {
      syncDetached(false)
      const sweep = advanceSweep(gesture.sweep, angle)
      gestureRef.current = { ...gesture, sweep, moved: true }
      syncHidden(gesture.arc.entry.id)
      syncColor(gesture.arc.color)
      const range = resizeRange(gesture.arc, gesture.edge, sweep.accumulated, maxMinute)
      setDraft((previous) => (sameRange(previous, range) ? previous : range))
      return
    }

    const fraction = pointerRadiusFraction(event.clientX, event.clientY, rect)
    const detached = fraction > 1.08
    syncDetached(detached)
    syncMoving(true)
    syncOverBin(pointOverBin(event.clientX, event.clientY))
    syncHidden(gesture.arc.entry.id)
    syncColor(gesture.arc.color)

    if (detached) {
      // Freeze the sweep: keep the accumulated minutes, but follow the pointer's angle
      // so coming back inside continues without a jump.
      gestureRef.current = {
        ...gesture,
        moved: true,
        sweep: { ...gesture.sweep, lastAngle: angle },
      }
      return
    }

    const sweep = advanceSweep(gesture.sweep, angle)
    gestureRef.current = { ...gesture, sweep, moved: true }
    const range = moveRange(gesture.arc, sweep.accumulated, maxMinute)
    setDraft((previous) => (sameRange(previous, range) ? previous : range))
  })

  const handleUp = useEffectEvent((event: PointerEvent) => {
    const gesture = gestureRef.current
    if (!gesture) {
      return
    }

    const wasDetached = detachedRef.current
    gestureRef.current = null
    detachedRef.current = false
    syncHidden(null)
    syncMoving(false)
    syncOverBin(false)
    syncDetached(false)

    if (!gesture.moved) {
      setDraft(null)
      if (gesture.kind !== 'create') {
        onActivate(gesture.arc)
      }
      return
    }

    if (gesture.kind === 'create') {
      const position = clamp(
        gesture.sweep.originMinute + gesture.sweep.accumulated,
        0,
        maxMinute
      )
      const range = normalizeRange(gesture.sweep.originMinute, position, maxMinute)
      setDraft(null)
      if (range) {
        onCreateDraft(range)
      }
      return
    }

    if (gesture.kind === 'move' && pointOverBin(event.clientX, event.clientY)) {
      setDraft(null)
      onRequestDelete(gesture.arc.entry)
      return
    }

    if (gesture.kind === 'move' && wasDetached) {
      // Released outside the dial, away from the bin: cancel the move.
      setDraft(null)
      return
    }

    const range =
      gesture.kind === 'move'
        ? moveRange(gesture.arc, gesture.sweep.accumulated, maxMinute)
        : resizeRange(gesture.arc, gesture.edge, gesture.sweep.accumulated, maxMinute)

    setDraft(null)

    if (
      range.startMinute !== gesture.arc.startMinute ||
      range.endMinute !== gesture.arc.endMinute
    ) {
      onCommitMove(gesture.arc.entry, range.startMinute, range.endMinute)
    }
  })

  useEffect(() => {
    // One move per frame: pointermove can fire well above the refresh rate on
    // trackpads and pen displays, and each move costs a dial re-render.
    const flush = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      const event = latestRef.current
      latestRef.current = null
      if (event) {
        handleMove(event)
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!gestureRef.current) {
        return
      }
      latestRef.current = event
      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(flush)
      }
    }
    const onPointerUp = (event: PointerEvent) => {
      // Settle on the release position: apply it as the last move so a fast drag
      // that ends between frames still lands where the pointer was let go.
      latestRef.current = event
      flush()
      handleUp(event)
    }
    const onPointerCancel = () => reset()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        reset()
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      window.removeEventListener('keydown', onKeyDown)
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      latestRef.current = null
    }
  }, [reset])

  const onTrackPointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (maxMinute <= 0) {
        return
      }

      const target = event.target
      if (target instanceof Element && target.closest('[data-dial-arc]')) {
        return
      }

      const svg = svgRef.current
      if (!svg) {
        return
      }

      const rect = svg.getBoundingClientRect()
      if (!rect.width) {
        return
      }

      const fraction = pointerRadiusFraction(event.clientX, event.clientY, rect)
      if (fraction < DIAL.trackInner || fraction > DIAL.trackOuter) {
        return
      }

      gestureRef.current = {
        kind: 'create',
        rect,
        sweep: startSweep(pointerAngle(event.clientX, event.clientY, rect)),
        moved: false,
        startX: event.clientX,
        startY: event.clientY,
      }
      svg.setPointerCapture?.(event.pointerId)
    },
    [maxMinute, svgRef]
  )

  const onArcPointerDown = useCallback(
    (arc: DialArc, part: ArcPart, event: React.PointerEvent) => {
      if (part === 'body' && arc.isRunning) {
        return
      }

      event.stopPropagation()
      event.preventDefault()

      const svg = svgRef.current
      if (!svg) {
        return
      }

      const rect = svg.getBoundingClientRect()
      if (!rect.width) {
        return
      }

      const sweep = startSweep(pointerAngle(event.clientX, event.clientY, rect))
      const startX = event.clientX
      const startY = event.clientY

      gestureRef.current =
        part === 'body'
          ? {
              kind: 'move',
              arc,
              rect,
              sweep,
              duration: Math.max(MIN_BLOCK_MINUTES, arc.endMinute - arc.startMinute),
              moved: false,
              startX,
              startY,
            }
          : { kind: 'resize', arc, edge: part, rect, sweep, moved: false, startX, startY }

      svg.setPointerCapture?.(event.pointerId)
    },
    [svgRef]
  )

  return {
    draft,
    draftColor,
    hiddenEntryId,
    isMoving,
    isOverBin,
    isDetached,
    onTrackPointerDown,
    onArcPointerDown,
  }
}
