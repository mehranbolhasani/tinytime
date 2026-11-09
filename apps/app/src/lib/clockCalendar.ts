import { DRAG_SNAP_MINUTES } from '@/lib/calendar'
import { toSafeHexColor } from '@/lib/color'
import { computeDuration } from '@/lib/utils'
import type { NormalizedGoogleEvent, TimeEntry } from '@/types'

/** 0 = midnight–noon (AM), 1 = noon–midnight (PM) */
export type ClockPeriod = 0 | 1

export const MINUTES_IN_PERIOD = 12 * 60
export const CLOCK_SNAP_MINUTES = DRAG_SNAP_MINUTES
export const DEFAULT_CREATE_MINUTES = 30
export const MIN_ARC_MINUTES = 15

export const FACE_RADIUS = 0.32
export const NUMERAL_RADIUS = 0.42
export const INNER_DOT_RADIUS = 0.52
export const OUTER_DOT_RADIUS = 0.62
export const ARC_RADIUS = 0.72
export const ARC_RADIUS_LANE_1 = 0.82
export const HANDLE_RADIUS = 0.72

export interface ClockArc {
  entry: TimeEntry
  startAngle: number
  endAngle: number
  startMs: number
  endMs: number
  startMinute: number
  endMinute: number
  lane: 0 | 1
  hasOverlap: boolean
  label: string
  color: string
  isLive?: boolean
}

export interface GoogleClockArc {
  event: NormalizedGoogleEvent
  startAngle: number
  endAngle: number
  startMs: number
  endMs: number
  label: string
  color: string
}

export interface PolarPoint {
  x: number
  y: number
}

export interface DraftRange {
  startMinute: number
  endMinute: number
}

export function periodFromDate(date: Date): ClockPeriod {
  return date.getHours() < 12 ? 0 : 1
}

export function periodLabel(period: ClockPeriod): string {
  return period === 0 ? 'AM' : 'PM'
}

export function periodBounds(dayStart: Date, period: ClockPeriod): { start: Date; end: Date } {
  const start = new Date(dayStart)
  start.setHours(period === 0 ? 0 : 12, 0, 0, 0)
  const end = new Date(start)
  end.setHours(start.getHours() + 12, 0, 0, 0)
  return { start, end }
}

/** Minutes within the current 12-hour period [0, 720). */
export function minuteOfPeriod(date: Date): number {
  const hours = date.getHours() % 12
  return hours * 60 + date.getMinutes() + date.getSeconds() / 60
}

/** Angle in radians; 12 o'clock = -π/2, clockwise positive via increasing minutes. */
export function minutesToAngle(minutes: number): number {
  const clamped = ((minutes % MINUTES_IN_PERIOD) + MINUTES_IN_PERIOD) % MINUTES_IN_PERIOD
  return (clamped / MINUTES_IN_PERIOD) * Math.PI * 2 - Math.PI / 2
}

export function angleToMinutes(angle: number): number {
  let normalized = angle + Math.PI / 2
  while (normalized < 0) normalized += Math.PI * 2
  while (normalized >= Math.PI * 2) normalized -= Math.PI * 2
  return (normalized / (Math.PI * 2)) * MINUTES_IN_PERIOD
}

export function pointerToAngle(
  clientX: number,
  clientY: number,
  centerX: number,
  centerY: number
): number {
  return Math.atan2(clientY - centerY, clientX - centerX)
}

export function snapMinutes(minutes: number, step = CLOCK_SNAP_MINUTES): number {
  if (!Number.isFinite(minutes)) {
    return 0
  }
  const snapped = Math.round(minutes / step) * step
  return Math.max(0, Math.min(MINUTES_IN_PERIOD, snapped))
}

export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angle: number
): PolarPoint {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  }
}

export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  let sweep = endAngle - startAngle
  if (sweep <= 0) {
    sweep += Math.PI * 2
  }

  const start = polarToCartesian(cx, cy, radius, startAngle)
  const end = polarToCartesian(cx, cy, radius, endAngle)
  const largeArc = sweep > Math.PI ? 1 : 0

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

export function formatClockTime(date: Date): string {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const period = hours >= 12 ? 'pm' : 'am'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  if (minutes === 0) {
    return `${hour12}${period}`
  }
  return `${hour12}:${String(minutes).padStart(2, '0')}${period}`
}

export function formatClockRange(start: Date, end: Date): string {
  return `${formatClockTime(start)} – ${formatClockTime(end)}`
}

export function dateFromPeriodMinute(
  dayStart: Date,
  period: ClockPeriod,
  minute: number
): Date {
  const { start } = periodBounds(dayStart, period)
  const next = new Date(start)
  const safeMinute = Math.max(0, Math.min(MINUTES_IN_PERIOD, minute))
  next.setMinutes(next.getMinutes() + safeMinute)
  return next
}

function entryLabel(entry: TimeEntry): string {
  const description = entry.description?.trim()
  if (description) {
    return description
  }
  return entry.projects?.name?.trim() || 'Untitled'
}

function clipIntervalToPeriod(
  start: Date,
  end: Date,
  periodStart: Date,
  periodEnd: Date
): { start: Date; end: Date } | null {
  const visibleStart = start > periodStart ? start : periodStart
  const visibleEnd = end < periodEnd ? end : periodEnd
  if (visibleEnd <= visibleStart) {
    return null
  }
  return { start: visibleStart, end: visibleEnd }
}

export function toClockArc(
  entry: TimeEntry,
  dayStart: Date,
  period: ClockPeriod,
  durationSeconds: number,
  isLive = false
): ClockArc | null {
  const { start: periodStart, end: periodEnd } = periodBounds(dayStart, period)
  const start = new Date(entry.started_at)
  const end = entry.stopped_at
    ? new Date(entry.stopped_at)
    : new Date(start.getTime() + Math.max(durationSeconds, 0) * 1000)

  const clipped = clipIntervalToPeriod(start, end, periodStart, periodEnd)
  if (!clipped) {
    return null
  }

  const startMinute = minuteOfPeriod(clipped.start)
  const endMinuteRaw = minuteOfPeriod(clipped.end)
  // Period end maps to minute 0 of next period — treat as full period end
  const endMinute =
    clipped.end.getTime() >= periodEnd.getTime()
      ? MINUTES_IN_PERIOD
      : endMinuteRaw <= startMinute
        ? MINUTES_IN_PERIOD
        : endMinuteRaw

  if (endMinute - startMinute < 0.5) {
    return null
  }

  return {
    entry,
    startAngle: minutesToAngle(startMinute),
    endAngle: minutesToAngle(Math.min(endMinute, MINUTES_IN_PERIOD - 0.001)),
    startMs: clipped.start.getTime(),
    endMs: clipped.end.getTime(),
    startMinute,
    endMinute: Math.min(endMinute, MINUTES_IN_PERIOD),
    lane: 0,
    hasOverlap: false,
    label: entryLabel(entry),
    color: toSafeHexColor(entry.projects?.color, '#a8a29e'),
    isLive,
  }
}

export function assignClockOverlapLanes(arcs: ClockArc[]): ClockArc[] {
  const next = [...arcs].sort((a, b) => a.startMs - b.startMs)

  for (let i = 0; i < next.length; i += 1) {
    for (let j = i + 1; j < next.length; j += 1) {
      const first = next[i]
      const second = next[j]
      const overlaps = first.startMs < second.endMs && second.startMs < first.endMs
      if (!overlaps) {
        continue
      }
      first.hasOverlap = true
      second.hasOverlap = true
      if (first.lane === second.lane) {
        second.lane = first.lane === 0 ? 1 : 0
      }
    }
  }

  return next
}

export function entriesToClockArcs(
  entries: TimeEntry[],
  dayStart: Date,
  period: ClockPeriod,
  liveElapsedSeconds = 0
): ClockArc[] {
  const arcs = entries
    .map((entry) => {
      const isLive = entry.stopped_at === null
      const duration = isLive
        ? liveElapsedSeconds
        : (entry.duration_seconds ?? 0)
      return toClockArc(entry, dayStart, period, duration, isLive)
    })
    .filter((arc): arc is ClockArc => arc !== null)

  return assignClockOverlapLanes(arcs)
}

export function toGoogleClockArc(
  event: NormalizedGoogleEvent,
  dayStart: Date,
  period: ClockPeriod
): GoogleClockArc | null {
  if (event.isAllDay) {
    return null
  }

  const { start: periodStart, end: periodEnd } = periodBounds(dayStart, period)
  const start = new Date(event.startedAt)
  const end = new Date(event.stoppedAt)
  const clipped = clipIntervalToPeriod(start, end, periodStart, periodEnd)
  if (!clipped) {
    return null
  }

  const startMinute = minuteOfPeriod(clipped.start)
  let endMinute = minuteOfPeriod(clipped.end)
  if (clipped.end.getTime() >= periodEnd.getTime()) {
    endMinute = MINUTES_IN_PERIOD
  } else if (endMinute <= startMinute) {
    endMinute = MINUTES_IN_PERIOD
  }

  return {
    event,
    startAngle: minutesToAngle(startMinute),
    endAngle: minutesToAngle(Math.min(endMinute, MINUTES_IN_PERIOD - 0.001)),
    startMs: clipped.start.getTime(),
    endMs: clipped.end.getTime(),
    label: event.title || 'Event',
    color: toSafeHexColor(event.calendarColor, '#94a3b8'),
  }
}

export function googleEventsToClockArcs(
  events: NormalizedGoogleEvent[],
  dayStart: Date,
  period: ClockPeriod
): GoogleClockArc[] {
  return events
    .map((event) => toGoogleClockArc(event, dayStart, period))
    .filter((arc): arc is GoogleClockArc => arc !== null)
}

/** Unique project colors for a day's entries — used by month cell mini-arcs. */
export function daySummaryColors(entries: TimeEntry[], max = 4): string[] {
  const colors: string[] = []
  const seen = new Set<string>()

  for (const entry of entries) {
    const color = toSafeHexColor(entry.projects?.color, '#a8a29e')
    if (seen.has(color)) {
      continue
    }
    seen.add(color)
    colors.push(color)
    if (colors.length >= max) {
      break
    }
  }

  return colors
}

export function localMonthRange(year: number, monthIndex: number): { from: string; to: string } {
  const from = new Date(year, monthIndex, 1, 0, 0, 0, 0)
  const to = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function buildMonthGrid(year: number, monthIndex: number): Date[] {
  const first = new Date(year, monthIndex, 1)
  const startWeekday = first.getDay()
  const cells: Date[] = []
  const gridStart = new Date(year, monthIndex, 1 - startWeekday)

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + i)
    cells.push(day)
  }

  return cells
}

export function handAnglesFromDate(date: Date): {
  hour: number
  minute: number
  second: number
} {
  const seconds = date.getSeconds() + date.getMilliseconds() / 1000
  const minutes = date.getMinutes() + seconds / 60
  const hours = (date.getHours() % 12) + minutes / 60

  return {
    hour: minutesToAngle((hours / 12) * MINUTES_IN_PERIOD),
    minute: minutesToAngle((minutes / 60) * MINUTES_IN_PERIOD),
    second: minutesToAngle((seconds / 60) * MINUTES_IN_PERIOD),
  }
}

export function draftToIsoRange(
  dayStart: Date,
  period: ClockPeriod,
  draft: DraftRange
): { started_at: string; stopped_at: string; duration_seconds: number } {
  const started = dateFromPeriodMinute(dayStart, period, draft.startMinute)
  const stopped = dateFromPeriodMinute(dayStart, period, draft.endMinute)
  const started_at = started.toISOString()
  const stopped_at = stopped.toISOString()
  return {
    started_at,
    stopped_at,
    duration_seconds: computeDuration(started_at, stopped_at),
  }
}

export function normalizeCreateRange(
  startMinute: number,
  endMinute: number
): { startMinute: number; endMinute: number } {
  let start = snapMinutes(Math.min(startMinute, endMinute))
  let end = snapMinutes(Math.max(startMinute, endMinute))

  if (end <= start) {
    end = Math.min(MINUTES_IN_PERIOD, start + DEFAULT_CREATE_MINUTES)
  }
  if (end - start < MIN_ARC_MINUTES) {
    end = Math.min(MINUTES_IN_PERIOD, start + MIN_ARC_MINUTES)
  }
  if (end >= MINUTES_IN_PERIOD && start >= MINUTES_IN_PERIOD - MIN_ARC_MINUTES) {
    start = Math.max(0, MINUTES_IN_PERIOD - MIN_ARC_MINUTES)
    end = MINUTES_IN_PERIOD
  }

  return { startMinute: start, endMinute: end }
}
