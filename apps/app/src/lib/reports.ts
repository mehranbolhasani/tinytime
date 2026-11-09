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
