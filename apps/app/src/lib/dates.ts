interface DayRangeResult {
  from: string | null
  to: string | null
}

/**
 * Returns a new Date at local midnight for the given date.
 */
export function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

/**
 * Returns a new Date moved by the given number of days. Negative values move backwards.
 */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/**
 * Returns true when both dates fall on the same local calendar day.
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Returns local midnight on the Monday of the given date's week.
 */
export function startOfWeek(date: Date): Date {
  const dayStart = startOfDay(date)
  const day = dayStart.getDay()
  const diff = (day + 6) % 7
  return addDays(dayStart, -diff)
}

/**
 * Returns local midnight on the first day of the given date's month.
 */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/**
 * Formats a Date as `YYYY-MM-DD` in local time.
 */
export function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns the ISO range from local midnight of the given date to local midnight the next day.
 * Returns nulls for invalid input.
 */
export function localDayRange(dateInput: string | Date): DayRangeResult {
  const dayStart = new Date(dateInput)
  if (Number.isNaN(dayStart.getTime())) {
    return {
      from: null,
      to: null,
    }
  }

  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  return {
    from: dayStart.toISOString(),
    to: dayEnd.toISOString(),
  }
}

/**
 * Converts inclusive `YYYY-MM-DD` date-input values into an ISO range
 * [local midnight of `from`, local midnight of the day after `to`).
 * Returns nulls for invalid input or when from > to.
 */
export function localDateInputRange(
  fromValue: string | null,
  toValue: string | null
): DayRangeResult {
  const parse = (value: string | null): Date | null => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const fromDate = parse(fromValue)
  const toDate = parse(toValue)
  if (!fromDate || !toDate || fromDate.getTime() > toDate.getTime()) {
    return { from: null, to: null }
  }

  const toExclusive = new Date(toDate)
  toExclusive.setDate(toExclusive.getDate() + 1)
  return { from: fromDate.toISOString(), to: toExclusive.toISOString() }
}
