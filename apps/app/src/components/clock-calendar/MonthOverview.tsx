import { useMemo } from 'react'
import { buildMonthGrid, describeArc, entriesToDialArcs } from '@/lib/clockCalendar'
import { localDateKey, startOfDay } from '@/lib/dates'
import { computeDuration, formatDuration } from '@/lib/utils'
import type { TimeEntry } from '@/types'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const MINI_SIZE = 36
const MINI_RADIUS = 15

interface MonthOverviewProps {
  selectedDate: Date
  viewYear: number
  viewMonth: number
  entriesByDay: Record<string, TimeEntry[]>
  onSelectDate: (date: Date) => void
  onViewMonthChange: (year: number, month: number) => void
}

function MiniDial({ date, entries }: { date: Date; entries: TimeEntry[] }) {
  const dayStart = startOfDay(date)
  const arcs = entriesToDialArcs(entries, dayStart, new Date())

  return (
    <svg
      width={MINI_SIZE}
      height={MINI_SIZE}
      viewBox={`0 0 ${MINI_SIZE} ${MINI_SIZE}`}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      <circle
        cx={MINI_SIZE / 2}
        cy={MINI_SIZE / 2}
        r={MINI_RADIUS}
        fill="none"
        strokeWidth={2}
        className="stroke-muted-foreground/15"
      />
      {arcs.map((arc) => (
        <path
          key={arc.entry.id}
          d={describeArc(MINI_SIZE / 2, MINI_SIZE / 2, MINI_RADIUS, arc.startMinute, arc.endMinute)}
          fill="none"
          stroke={arc.color}
          strokeWidth={3}
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}

export default function MonthOverview({
  selectedDate,
  viewYear,
  viewMonth,
  entriesByDay,
  onSelectDate,
  onViewMonthChange,
}: MonthOverviewProps) {
  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])
  const today = useMemo(() => new Date(), [])
  const yearOptions = useMemo(() => {
    const current = today.getFullYear()
    return Array.from({ length: 7 }, (_, i) => current - 2 + i)
  }, [today])

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MONTH_LABELS.map((label, index) => {
          const active = index === viewMonth
          return (
            <button
              key={label}
              type="button"
              aria-pressed={active}
              className={
                active
                  ? 'shrink-0 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors'
                  : 'shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground'
              }
              onClick={() => onViewMonthChange(viewYear, index)}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {yearOptions.map((year) => {
          const active = year === viewYear
          return (
            <button
              key={year}
              type="button"
              aria-pressed={active}
              className={
                active
                  ? 'shrink-0 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors'
                  : 'shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground'
              }
              onClick={() => onViewMonthChange(year, viewMonth)}
            >
              {year}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((day, index) => (
          <div key={`${day}-${index}`} className="py-1 text-[10px] font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {cells.map((date) => {
          const inMonth = date.getMonth() === viewMonth
          const selected = date.toDateString() === selectedDate.toDateString()
          const isToday = date.toDateString() === today.toDateString()
          const key = localDateKey(date)
          const dayEntries = entriesByDay[key] ?? []
          const totalSeconds = dayEntries.reduce((sum, entry) => {
            if (!entry.stopped_at) {
              return sum
            }
            return (
              sum +
              (entry.duration_seconds ?? computeDuration(entry.started_at, entry.stopped_at))
            )
          }, 0)

          return (
            <button
              key={key + String(date.getMonth())}
              type="button"
              aria-label={`${date.toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}, ${formatDuration(totalSeconds)} tracked`}
              aria-current={selected ? 'date' : undefined}
              className={
                selected
                  ? 'relative mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground ring-2 ring-foreground transition-colors'
                  : inMonth
                    ? 'relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm text-foreground transition-colors hover:bg-secondary'
                    : 'relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm text-muted-foreground/35 transition-colors hover:bg-secondary'
              }
              onClick={() => onSelectDate(date)}
            >
              <MiniDial date={date} entries={dayEntries} />
              {isToday && !selected ? (
                <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-primary/50" />
              ) : null}
              <span className="relative z-10">{date.getDate()}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
