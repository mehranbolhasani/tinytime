export const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
export const HOUR_HEIGHT = 32
export const GRID_HEIGHT = HOUR_HEIGHT * 24
export const TIME_COLUMN_WIDTH = 56
export const MIN_ENTRY_HEIGHT = 20
export const MINUTES_IN_DAY = 24 * 60
export const DRAG_SNAP_MINUTES = 15
export const DEFAULT_CREATE_MINUTES = 30

export function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function toBlock(entry, dayStart, dayEnd, durationSeconds, minHeight = MIN_ENTRY_HEIGHT) {
  const start = new Date(entry.started_at)
  const end = entry.stopped_at ? new Date(entry.stopped_at) : new Date(start.getTime() + durationSeconds * 1000)
  const visibleStart = start > dayStart ? start : dayStart
  const visibleEnd = end < dayEnd ? end : dayEnd

  if (visibleEnd <= visibleStart) {
    return null
  }

  const topMinutes = (visibleStart.getTime() - dayStart.getTime()) / 60000
  const durationMinutes = (visibleEnd.getTime() - visibleStart.getTime()) / 60000

  return {
    entry,
    top: (topMinutes / 60) * HOUR_HEIGHT,
    height: Math.max((durationMinutes / 60) * HOUR_HEIGHT, minHeight),
    startMs: visibleStart.getTime(),
    endMs: visibleEnd.getTime(),
    lane: 0,
    hasOverlap: false,
  }
}

export function assignOverlapLanes(blocks) {
  const nextBlocks = [...blocks].sort((a, b) => a.startMs - b.startMs)

  for (let i = 0; i < nextBlocks.length; i += 1) {
    for (let j = i + 1; j < nextBlocks.length; j += 1) {
      const first = nextBlocks[i]
      const second = nextBlocks[j]
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

  return nextBlocks
}

export function getNowLinePosition(nowDate) {
  const minutes = nowDate.getHours() * 60 + nowDate.getMinutes() + nowDate.getSeconds() / 60
  return (minutes / 60) * HOUR_HEIGHT
}

export function getDropStartMinutes(clientY, targetRect, durationMinutes = 0, snapStepMinutes = DRAG_SNAP_MINUTES) {
  const minutesFromTop = ((clientY - targetRect.top) / HOUR_HEIGHT) * 60
  const snappedMinutes = Math.round(minutesFromTop / snapStepMinutes) * snapStepMinutes
  const maxMinutes = Math.max(0, MINUTES_IN_DAY - durationMinutes)
  return Math.max(0, Math.min(snappedMinutes, maxMinutes))
}

export function minutesToTop(minutes) {
  return (minutes / 60) * HOUR_HEIGHT
}

export function minutesToHeight(minutes, minHeight = MIN_ENTRY_HEIGHT) {
  return Math.max((minutes / 60) * HOUR_HEIGHT, minHeight)
}
