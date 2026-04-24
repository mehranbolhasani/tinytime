import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0'))

function parseDateTimeValue(value) {
  if (!value || !value.includes('T')) {
    return null
  }

  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) {
    return null
  }

  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  const parsed = new Date(year, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0, 0, 0)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toDateTimeValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function getMonthDays(viewDate) {
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const mondayOffset = (monthStart.getDay() + 6) % 7
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })
}

function isSameDate(first, second) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  )
}

function formatDisplay(value) {
  const parsed = parseDateTimeValue(value)
  if (!parsed) {
    return ''
  }

  return parsed.toLocaleString([], {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function DateTimeField({ id, value, onChange, required, className }) {
  const selectedDate = parseDateTimeValue(value)
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => selectedDate ?? new Date())

  const monthDays = useMemo(() => getMonthDays(viewDate), [viewDate])

  const updateDateTime = (nextDate) => {
    onChange(toDateTimeValue(nextDate))
  }

  const handleDateSelect = (dayDate) => {
    const base = selectedDate ?? new Date()
    const next = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), base.getHours(), base.getMinutes())
    updateDateTime(next)
  }

  const handleHourChange = (nextHour) => {
    const base = selectedDate ?? new Date()
    const next = new Date(base)
    next.setHours(Number(nextHour))
    updateDateTime(next)
  }

  const handleMinuteChange = (nextMinute) => {
    const base = selectedDate ?? new Date()
    const next = new Date(base)
    next.setMinutes(Number(nextMinute))
    updateDateTime(next)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (nextOpen) {
            setViewDate(selectedDate ?? new Date())
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-secondary px-3 text-left text-sm text-foreground outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring/40"
          >
            <span className={cn('truncate', !value && 'text-muted-foreground/70')}>
              {formatDisplay(value) || 'Select date and time'}
            </span>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
                }
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold">
                {viewDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() =>
                  setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
                }
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {WEEK_DAYS.map((dayName, index) => (
                <span key={`${dayName}-${index}`}>{dayName}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((dayDate) => {
                const isCurrentMonth = dayDate.getMonth() === viewDate.getMonth()
                const isSelected = selectedDate ? isSameDate(dayDate, selectedDate) : false
                const isToday = isSameDate(dayDate, new Date())
                return (
                  <button
                    key={dayDate.toISOString()}
                    type="button"
                    onClick={() => handleDateSelect(dayDate)}
                    className={cn(
                      'h-9 w-9 rounded-md text-sm transition-colors',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-secondary',
                      !isCurrentMonth && 'text-muted-foreground/50',
                      isToday && !isSelected && 'ring-1 ring-primary/35'
                    )}
                  >
                    {dayDate.getDate()}
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select value={selectedDate ? String(selectedDate.getHours()).padStart(2, '0') : '00'} onValueChange={handleHourChange}>
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue placeholder="Hour" />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedDate ? String(selectedDate.getMinutes()).padStart(2, '0') : '00'} onValueChange={handleMinuteChange}>
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue placeholder="Minute" />
                </SelectTrigger>
                <SelectContent>
                  {MINUTES.map((minute) => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange('')}
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const now = new Date()
                  onChange(toDateTimeValue(now))
                  setViewDate(now)
                }}
              >
                Now
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <input value={value} readOnly required={required} className="sr-only" tabIndex={-1} aria-hidden />
    </div>
  )
}
