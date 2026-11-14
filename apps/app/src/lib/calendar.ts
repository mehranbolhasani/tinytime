import { computeDuration } from '@/lib/utils'
import type { CalendarBlock, TimeEntry } from '@/types'

export const HOURS: number[] = Array.from({ length: 24 }, (_, hour) => hour)
export const HOUR_HEIGHT = 32
export const MIN_ENTRY_HEIGHT = 20
export const MINUTES_IN_DAY = 24 * 60
const DRAG_SNAP_MINUTES = 15
export const DEFAULT_CREATE_MINUTES = 30

export function getGridHeight(hourHeight = HOUR_HEIGHT): number {
  return hourHeight * 24
}

/**
 * Duration of an entry in seconds: the stored value, or the difference between
 * its start and stop times, or 0 while it is still running.
 */
export function entryDurationSeconds(entry: TimeEntry): number {
  return entry.duration_seconds ?? (entry.stopped_at ? computeDuration(entry.started_at, entry.stopped_at) : 0)
}

/**
 * Builds the `createEntry` input for a copy of the entry. A stopped entry keeps
 * its exact start and stop times; a running entry gets at least one minute.
 */
export function buildDuplicateInput(entry: TimeEntry) {
  const startedAt = new Date(entry.started_at)
  const stoppedAt = entry.stopped_at
    ? new Date(entry.stopped_at)
    : new Date(startedAt.getTime() + Math.max(60, entryDurationSeconds(entry)) * 1000)
  const stoppedAtIso = stoppedAt.toISOString()

  return {
    project_id: entry.project_id,
    description: entry.description,
    started_at: entry.started_at,
    stopped_at: stoppedAtIso,
    duration_seconds: computeDuration(entry.started_at, stoppedAtIso),
  }
}

/**
 * Turns a drag's start and current minutes into a create range. A click (equal
 * minutes) becomes a `DEFAULT_CREATE_MINUTES` block, extending backwards at the
 * end of the day.
 */
export function getDraftRange(
  startMinutes: number,
  currentMinutes: number
): { fromMinutes: number; toMinutes: number; durationMinutes: number } {
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

export interface BlockGeometry {
  top: number
  height: number
  startMs: number
  endMs: number
}

/**
 * Clips an interval to the visible day and converts it to top/height pixels.
 * Returns null when no part of the interval falls inside the day.
 */
export function toBlockGeometry(
  startMs: number,
  endMs: number,
  dayStart: Date,
  dayEnd: Date,
  minHeight = MIN_ENTRY_HEIGHT,
  hourHeight = HOUR_HEIGHT
): BlockGeometry | null {
  const start = new Date(startMs)
  const end = new Date(endMs)
  const visibleStart = start > dayStart ? start : dayStart
  const visibleEnd = end < dayEnd ? end : dayEnd

  if (visibleEnd <= visibleStart) {
    return null
  }

  const topMinutes = (visibleStart.getTime() - dayStart.getTime()) / 60000
  const durationMinutes = (visibleEnd.getTime() - visibleStart.getTime()) / 60000

  return {
    top: (topMinutes / 60) * hourHeight,
    height: Math.max((durationMinutes / 60) * hourHeight, minHeight),
    startMs: visibleStart.getTime(),
    endMs: visibleEnd.getTime(),
  }
}

export function toBlock(
  entry: TimeEntry,
  dayStart: Date,
  dayEnd: Date,
  durationSeconds: number,
  minHeight = MIN_ENTRY_HEIGHT,
  hourHeight = HOUR_HEIGHT
): CalendarBlock | null {
  const start = new Date(entry.started_at)
  const end = entry.stopped_at
    ? new Date(entry.stopped_at)
    : new Date(start.getTime() + durationSeconds * 1000)
  const geometry = toBlockGeometry(
    start.getTime(),
    end.getTime(),
    dayStart,
    dayEnd,
    minHeight,
    hourHeight
  )

  if (!geometry) {
    return null
  }

  return {
    entry,
    ...geometry,
    lane: 0,
    laneCount: 1,
  }
}

interface LaneAssignment<T> {
  item: T
  lane: number
  laneCount: number
}

export function assignIntervalLanes<T>(
  items: T[],
  getStart: (item: T) => number,
  getEnd: (item: T) => number
): LaneAssignment<T>[] {
  const sorted = [...items].sort((a, b) => getStart(a) - getStart(b) || getEnd(b) - getEnd(a))
  const result: LaneAssignment<T>[] = []
  let cluster: LaneAssignment<T>[] = []
  let laneEnds: number[] = []
  let clusterEnd = Number.NEGATIVE_INFINITY

  const flush = () => {
    const count = cluster.reduce((max, entry) => Math.max(max, entry.lane + 1), 1)
    for (const entry of cluster) entry.laneCount = count
    result.push(...cluster)
    cluster = []
    laneEnds = []
    clusterEnd = Number.NEGATIVE_INFINITY
  }

  for (const item of sorted) {
    const start = getStart(item)
    const end = getEnd(item)
    if (cluster.length > 0 && start >= clusterEnd) flush()
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(end)
    } else {
      laneEnds[lane] = end
    }
    cluster.push({ item, lane, laneCount: 1 })
    clusterEnd = Math.max(clusterEnd, end)
  }
  if (cluster.length > 0) flush()
  return result
}

export function getNowLinePosition(nowDate: Date, hourHeight = HOUR_HEIGHT): number {
  const minutes = nowDate.getHours() * 60 + nowDate.getMinutes() + nowDate.getSeconds() / 60
  return (minutes / 60) * hourHeight
}

export function getDropStartMinutes(
  clientY: number,
  targetRect: DOMRect,
  durationMinutes = 0,
  hourHeight = HOUR_HEIGHT,
  snapStepMinutes = DRAG_SNAP_MINUTES
): number {
  const minutesFromTop = ((clientY - targetRect.top) / hourHeight) * 60
  const snappedMinutes = Math.round(minutesFromTop / snapStepMinutes) * snapStepMinutes
  const maxMinutes = Math.max(0, MINUTES_IN_DAY - durationMinutes)
  return Math.max(0, Math.min(snappedMinutes, maxMinutes))
}

export function minutesToTop(minutes: number, hourHeight = HOUR_HEIGHT): number {
  return (minutes / 60) * hourHeight
}

export function minutesToHeight(
  minutes: number,
  minHeight = MIN_ENTRY_HEIGHT,
  hourHeight = HOUR_HEIGHT
): number {
  return Math.max((minutes / 60) * hourHeight, minHeight)
}

export interface EntryOverride {
  entryId: string
  startedAt: string
  stoppedAt: string
  durationSeconds: number
}

/**
 * Draws an entry at the times the user just committed, before the mutation's
 * cache write reaches React. Returns the same array when there is no override.
 */
export function applyEntryOverride(entries: TimeEntry[], override: EntryOverride | null): TimeEntry[] {
  if (!override) return entries

  return entries.map((entry) =>
    entry.id === override.entryId
      ? {
          ...entry,
          started_at: override.startedAt,
          stopped_at: override.stoppedAt,
          duration_seconds: override.durationSeconds,
        }
      : entry
  )
}

/** True once the cached entry already sits at the override's instants. */
export function entriesReflectOverride(entries: TimeEntry[], override: EntryOverride): boolean {
  const start = new Date(override.startedAt).getTime()
  const stop = new Date(override.stoppedAt).getTime()

  return entries.some(
    (entry) =>
      entry.id === override.entryId &&
      entry.stopped_at !== null &&
      new Date(entry.started_at).getTime() === start &&
      new Date(entry.stopped_at).getTime() === stop
  )
}
