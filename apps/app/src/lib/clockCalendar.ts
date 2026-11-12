import { assignIntervalLanes } from '@/lib/calendar'
import { toSafeHexColor } from '@/lib/color'
import type { NormalizedGoogleEvent, TimeEntry } from '@/types'

export const MINUTES_IN_DAY = 1440
const CLOCK_SNAP_MINUTES = 15
export const MIN_BLOCK_MINUTES = 15
const MAX_LANES = 3

/** All values are fractions of R (= size / 2). */
export const DIAL = {
  googleRing: 0.95,
  googleStroke: 0.035,
  laneRadius: [0.82, 0.69, 0.56] as const,
  arcStroke: 0.11,
  trackInner: 0.5,
  trackOuter: 1.0,
  tickInner: 0.44,
  tickOuter: 0.48,
  numeralRadius: 0.37,
  handLength: 0.9,
  centerTextMax: 0.3,
} as const

export function minuteToAngle(minute: number): number {
  return (minute / MINUTES_IN_DAY) * Math.PI * 2 - Math.PI / 2
}

/** Absolute minute in [0, 1440) for an angle; used only for the *first* point of a gesture. */
export function angleToMinute(angle: number): number {
  const turn = (angle + Math.PI / 2) / (Math.PI * 2)
  return (((turn % 1) + 1) % 1) * MINUTES_IN_DAY
}

/** Signed shortest angular difference in (-π, π]. */
function angleDelta(from: number, to: number): number {
  let d = to - from
  while (d > Math.PI) d -= Math.PI * 2
  while (d <= -Math.PI) d += Math.PI * 2
  return d
}

function angleDeltaToMinutes(delta: number): number {
  return (delta / (Math.PI * 2)) * MINUTES_IN_DAY
}

export function pointerAngle(clientX: number, clientY: number, rect: DOMRect): number {
  return Math.atan2(
    clientY - (rect.top + rect.height / 2),
    clientX - (rect.left + rect.width / 2)
  )
}

/** Distance from the dial centre as a fraction of R. */
export function pointerRadiusFraction(
  clientX: number,
  clientY: number,
  rect: DOMRect
): number {
  const dx = clientX - (rect.left + rect.width / 2)
  const dy = clientY - (rect.top + rect.height / 2)
  return Math.hypot(dx, dy) / (rect.width / 2)
}

export function snapMinute(minute: number, step = CLOCK_SNAP_MINUTES): number {
  if (!Number.isFinite(minute)) {
    return 0
  }
  return Math.round(minute / step) * step
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  }
}

/** Clockwise arc from startMinute to endMinute. A full day is drawn as two half arcs. */
export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startMinute: number,
  endMinute: number
): string {
  if (endMinute - startMinute >= MINUTES_IN_DAY) {
    const top = polarPoint(cx, cy, radius, minuteToAngle(0))
    const bottom = polarPoint(cx, cy, radius, minuteToAngle(MINUTES_IN_DAY / 2))
    return `M ${top.x} ${top.y} A ${radius} ${radius} 0 0 1 ${bottom.x} ${bottom.y} A ${radius} ${radius} 0 0 1 ${top.x} ${top.y}`
  }

  const start = polarPoint(cx, cy, radius, minuteToAngle(startMinute))
  const end = polarPoint(cx, cy, radius, minuteToAngle(endMinute))
  const largeArc = endMinute - startMinute > MINUTES_IN_DAY / 2 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

export interface SweepState {
  originMinute: number
  lastAngle: number
  accumulated: number
}

export function startSweep(angle: number): SweepState {
  return { originMinute: angleToMinute(angle), lastAngle: angle, accumulated: 0 }
}

export function advanceSweep(state: SweepState, angle: number): SweepState {
  return {
    ...state,
    lastAngle: angle,
    accumulated:
      state.accumulated + angleDeltaToMinutes(angleDelta(state.lastAngle, angle)),
  }
}

/** Minutes since local midnight of `dayStart` (DST-safe; can exceed 1440 on 25h days). */
export function minuteOfDay(date: Date, dayStart: Date): number {
  return (date.getTime() - dayStart.getTime()) / 60000
}

/** Local Date for a minute of the given day (DST-safe). */
export function dateFromDayMinute(dayStart: Date, minute: number): Date {
  return new Date(
    dayStart.getFullYear(),
    dayStart.getMonth(),
    dayStart.getDate(),
    0,
    minute
  )
}

function localDayKey(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
}

/** 1440 for past days, the current minute for today, 0 (read-only) for future days. */
export function maxDrawableMinute(dayStart: Date, now: Date): number {
  const startKey = localDayKey(dayStart)
  const nowKey = localDayKey(now)

  if (startKey < nowKey) {
    return MINUTES_IN_DAY
  }
  if (startKey > nowKey) {
    return 0
  }

  return clamp(minuteOfDay(now, dayStart), 0, MINUTES_IN_DAY)
}

/**
 * Normalized block from two gesture minutes: ordered, snapped, clamped to [0, max],
 * at least MIN_BLOCK_MINUTES when room allows. A pure tap returns null.
 */
export function normalizeRange(
  a: number,
  b: number,
  max: number
): { startMinute: number; endMinute: number } | null {
  if (max <= 0 || a === b) {
    return null
  }

  const upper = clamp(max, 0, MINUTES_IN_DAY)
  let startMinute = clamp(snapMinute(Math.min(a, b)), 0, upper)
  let endMinute = clamp(snapMinute(Math.max(a, b)), 0, upper)

  if (endMinute - startMinute < MIN_BLOCK_MINUTES) {
    endMinute = Math.min(startMinute + MIN_BLOCK_MINUTES, upper)
    if (endMinute - startMinute < MIN_BLOCK_MINUTES) {
      startMinute = Math.max(0, endMinute - MIN_BLOCK_MINUTES)
    }
  }

  if (endMinute - startMinute < MIN_BLOCK_MINUTES) {
    return null
  }

  return { startMinute, endMinute }
}

export interface DialArc {
  entry: TimeEntry
  startMinute: number
  endMinute: number
  lane: number
  isRunning: boolean
  label: string
  color: string
}

export interface DialEventArc {
  event: NormalizedGoogleEvent
  startMinute: number
  endMinute: number
  color: string
}

export function assignLanes<T extends { startMinute: number; endMinute: number }>(
  items: T[]
): Array<T & { lane: number }> {
  return assignIntervalLanes(
    items,
    (item) => item.startMinute,
    (item) => item.endMinute
  ).map(({ item, lane }) => ({ ...item, lane: Math.min(lane, MAX_LANES - 1) }))
}

function entryLabel(entry: TimeEntry): string {
  const description = entry.description?.trim()
  if (description) {
    return description
  }
  return entry.projects?.name?.trim() || 'Untitled'
}

function clipToDay(start: Date, end: Date, dayStart: Date, dayEnd: Date) {
  const visibleStart = start > dayStart ? start : dayStart
  const visibleEnd = end < dayEnd ? end : dayEnd
  if (visibleEnd <= visibleStart) {
    return null
  }

  const startMinute = clamp(minuteOfDay(visibleStart, dayStart), 0, MINUTES_IN_DAY)
  const endMinute = clamp(minuteOfDay(visibleEnd, dayStart), 0, MINUTES_IN_DAY)
  if (endMinute <= startMinute) {
    return null
  }

  return { startMinute, endMinute }
}

function dayBounds(dayStart: Date): { start: Date; end: Date } {
  return {
    start: dayStart,
    end: new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1),
  }
}

/** Clips each entry to the selected day. A running entry ends at `now`. */
export function entriesToDialArcs(
  entries: TimeEntry[],
  dayStart: Date,
  now: Date
): DialArc[] {
  const { start: dayBegin, end: dayEnd } = dayBounds(dayStart)

  const arcs = entries.flatMap((entry): Omit<DialArc, 'lane'>[] => {
    const start = new Date(entry.started_at)
    if (Number.isNaN(start.getTime())) {
      return []
    }

    const isRunning = entry.stopped_at === null
    const end = isRunning ? now : new Date(entry.stopped_at as string)
    if (Number.isNaN(end.getTime())) {
      return []
    }

    const clipped = clipToDay(start, end, dayBegin, dayEnd)
    if (!clipped) {
      return []
    }

    return [{
      entry,
      startMinute: clipped.startMinute,
      endMinute: clipped.endMinute,
      isRunning,
      label: entryLabel(entry),
      color: toSafeHexColor(entry.projects?.color, '#a8a29e'),
    }]
  })

  return assignLanes(arcs)
}

/** Same for non-all-day Google events. */
export function eventsToDialArcs(
  events: NormalizedGoogleEvent[],
  dayStart: Date
): DialEventArc[] {
  const { start: dayBegin, end: dayEnd } = dayBounds(dayStart)

  return events.flatMap((event): DialEventArc[] => {
    if (event.isAllDay) {
      return []
    }

    const start = new Date(event.startedAt)
    const end = new Date(event.stoppedAt)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return []
    }

    const clipped = clipToDay(start, end, dayBegin, dayEnd)
    if (!clipped) {
      return []
    }

    return [{
      event,
      startMinute: clipped.startMinute,
      endMinute: clipped.endMinute,
      color: toSafeHexColor(event.calendarColor, '#94a3b8'),
    }]
  })
}

export function localMonthRange(year: number, monthIndex: number): { from: string; to: string } {
  const from = new Date(year, monthIndex, 1, 0, 0, 0, 0)
  const to = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0)
  return { from: from.toISOString(), to: to.toISOString() }
}

/** 42 dates, starting on the Monday of the week containing the 1st. */
export function buildMonthGrid(year: number, monthIndex: number): Date[] {
  const first = new Date(year, monthIndex, 1)
  const mondayOffset = (first.getDay() + 6) % 7
  const gridStart = new Date(year, monthIndex, 1 - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + index)
    return day
  })
}
