import { useMemo } from 'react'
import { isSameDay } from '@/lib/calendar'
import { buildMonthGrid, daySummaryColors } from '@/lib/clockCalendar'
import { cn } from '@/lib/utils'
import type { TimeEntry } from '@/types'

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface MonthOverviewProps {
  selectedDate: Date
  viewYear: number
  viewMonth: number
  entriesByDay: Record<string, TimeEntry[]>
  onSelectDate: (date: Date) => void
  onViewMonthChange: (year: number, month: number) => void
}

function DayCellArcs({ colors }: { colors: string[] }) {
  if (colors.length === 0) {
    return null
  }

  const size = 36
  const cx = size / 2
  const cy = size / 2
  const radius = 14
  const sweep = Math.min(0.9, 1.8 / Math.max(colors.length, 1))

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      {colors.map((color, index) => {
        const start = -Math.PI / 2 + index * ((Math.PI * 2) / Math.max(colors.length, 1))
        const end = start + sweep
        const x1 = cx + radius * Math.cos(start)
        const y1 = cy + radius * Math.sin(start)
        const x2 = cx + radius * Math.cos(end)
        const y2 = cy + radius * Math.sin(end)
        return (
          <path
            key={`${color}-${index}`}
            d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )
      })}
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
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'bg-foreground text-background'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
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
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'bg-foreground text-background'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
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
          const selected = isSameDay(date, selectedDate)
          const key = localDateKey(date)
          const colors = daySummaryColors(entriesByDay[key] ?? [])

          return (
            <button
              key={key + String(date.getMonth())}
              type="button"
              aria-label={date.toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              aria-current={selected ? 'date' : undefined}
              className={cn(
                'relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors',
                inMonth ? 'text-foreground' : 'text-muted-foreground/35',
                selected ? 'font-semibold ring-2 ring-foreground' : 'hover:bg-secondary'
              )}
              onClick={() => onSelectDate(date)}
            >
              <DayCellArcs colors={colors} />
              <span className="relative z-10">{date.getDate()}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
