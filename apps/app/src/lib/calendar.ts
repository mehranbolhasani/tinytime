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
  const visibleStart = start > dayStart ? start : dayStart
  const visibleEnd = end < dayEnd ? end : dayEnd

  if (visibleEnd <= visibleStart) {
    return null
  }

  const topMinutes = (visibleStart.getTime() - dayStart.getTime()) / 60000
  const durationMinutes = (visibleEnd.getTime() - visibleStart.getTime()) / 60000

  return {
    entry,
    top: (topMinutes / 60) * hourHeight,
    height: Math.max((durationMinutes / 60) * hourHeight, minHeight),
    startMs: visibleStart.getTime(),
    endMs: visibleEnd.getTime(),
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
