import type { RangePreset } from '@/components/reports/DateRangePicker'
import { toSafeHexColor } from '@/lib/color'
import {
  addDays,
  localDateInputRange,
  localDateKey,
  startOfMonth,
  startOfWeek,
} from '@/lib/dates'
import type { TimeEntry } from '@/types'

const NO_PROJECT_KEY = 'no-project'
const NO_PROJECT_COLOR = '#94a3b8'

/** Resolves a report range preset (or custom range) into an ISO [from, to) range. */
export function buildReportRange(
  range: RangePreset,
  customFrom: string | null,
  customTo: string | null
): { from: string | null; to: string | null } {
  const now = new Date()

  if (range === 'this_week') {
    const from = startOfWeek(now)
    const to = addDays(from, 7)
    return { from: from.toISOString(), to: to.toISOString() }
  }

  if (range === 'last_week') {
    const thisWeekStart = startOfWeek(now)
    const from = addDays(thisWeekStart, -7)
    const to = thisWeekStart
    return { from: from.toISOString(), to: to.toISOString() }
  }

  if (range === 'this_month') {
    const from = startOfMonth(now)
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 1)
    return { from: from.toISOString(), to: to.toISOString() }
  }

  if (range === 'last_month') {
    const thisMonthStart = startOfMonth(now)
    const from = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - 1, 1)
    return { from: from.toISOString(), to: thisMonthStart.toISOString() }
  }

  return localDateInputRange(customFrom, customTo)
}

interface DailyChartProject {
  id: string
  name: string
  color: string
}

type DailyChartBucket = {
  dateKey: string
  [projectId: string]: number | string
}

function calendarDaysBetween(from: Date, to: Date): number {
  const startUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const endUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((endUtc - startUtc) / (24 * 60 * 60 * 1000))
}

/**
 * Builds the stacked daily chart data. For ranges up to 62 days, one bucket is
 * emitted for every local day in [from, to), including empty days.
 */
export function buildDailyChartData(
  entries: TimeEntry[],
  range: { from: string | null; to: string | null }
): { data: DailyChartBucket[]; projects: DailyChartProject[] } {
  const projectMap = new Map<string, DailyChartProject>()
  const dayMap = new Map<string, DailyChartBucket>()

  for (const entry of entries) {
    const start = new Date(entry.started_at)
    if (Number.isNaN(start.getTime())) {
      continue
    }

    const dateKey = localDateKey(start)
    const projectKey = entry.project_id ?? NO_PROJECT_KEY
    const seconds = entry.duration_seconds ?? 0

    if (!projectMap.has(projectKey)) {
      projectMap.set(projectKey, {
        id: projectKey,
        name: entry.projects?.name ?? 'No project',
        color: toSafeHexColor(entry.projects?.color, NO_PROJECT_COLOR),
      })
    }

    let bucket = dayMap.get(dateKey)
    if (!bucket) {
      bucket = { dateKey }
      dayMap.set(dateKey, bucket)
    }

    bucket[projectKey] = ((bucket[projectKey] as number) ?? 0) + seconds
  }

  const from = range.from ? new Date(range.from) : null
  const to = range.to ? new Date(range.to) : null

  if (
    from &&
    to &&
    !Number.isNaN(from.getTime()) &&
    !Number.isNaN(to.getTime()) &&
    to.getTime() > from.getTime()
  ) {
    const dayCount = calendarDaysBetween(from, to)

    if (dayCount >= 1 && dayCount <= 62) {
      const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
      for (let index = 0; index < dayCount; index += 1) {
        const dateKey = localDateKey(cursor)
        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, { dateKey })
        }
        cursor.setDate(cursor.getDate() + 1)
      }
    }
  }

  const data = Array.from(dayMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey))

  return {
    data,
    projects: Array.from(projectMap.values()),
  }
}

/**
 * Splits [start, end) into per-(weekday, hour) seconds.
 * Weekday is 0 = Monday … 6 = Sunday. Hour boundaries are local-time.
 */
export function distributeAcrossHours(
  start: Date,
  end: Date
): Array<{ weekday: number; hour: number; seconds: number }> {
  const startMs = start.getTime()
  const endMs = end.getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return []
  }

  const result: Array<{ weekday: number; hour: number; seconds: number }> = []
  let cursor = new Date(startMs)

  while (cursor.getTime() < endMs) {
    const nextHour = new Date(cursor.getTime())
    nextHour.setMinutes(0, 0, 0)
    nextHour.setHours(nextHour.getHours() + 1)

    const sliceEnd = nextHour.getTime() < endMs ? nextHour : new Date(endMs)
    const seconds = Math.round((sliceEnd.getTime() - cursor.getTime()) / 1000)

    if (seconds > 0) {
      result.push({
        weekday: (cursor.getDay() + 6) % 7,
        hour: cursor.getHours(),
        seconds,
      })
    }

    cursor = sliceEnd
  }

  return result
}
