import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { TimeEntry } from '@/types'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const totalSeconds = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours === 0) {
    return `${minutes}m`
  }

  return `${hours}h ${minutes}m`
}

export function formatDurationOrDash(seconds: number): string {
  const totalSeconds = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0
  if (totalSeconds <= 0) {
    return '—'
  }

  return formatDuration(totalSeconds)
}

export function formatDurationHMS(seconds: number): string {
  const totalSeconds = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString([], {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

function getLocalDateKey(dateInput: string | Date): string {
  const date = new Date(dateInput)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function groupEntriesByDay(entries: TimeEntry[]): Record<string, TimeEntry[]> {
  return entries.reduce<Record<string, TimeEntry[]>>((groups, entry) => {
    if (!entry?.started_at) {
      return groups
    }

    const dateKey = getLocalDateKey(entry.started_at)

    if (!groups[dateKey]) {
      groups[dateKey] = []
    }

    groups[dateKey].push(entry)
    return groups
  }, {})
}

export function computeDuration(startedAt: string, stoppedAt: string): number {
  const startDate = new Date(startedAt)
  const stopDate = new Date(stoppedAt)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(stopDate.getTime())) {
    return 0
  }

  return Math.round((stopDate.getTime() - startDate.getTime()) / 1000)
}

function padNumber(value: number): string {
  return String(value).padStart(2, '0')
}

interface LocalDateParts {
  year: number
  month: string
  day: string
  hours: string
  minutes: string
  dateKey: string
  timeKey: string
}

function toLocalDateParts(dateInput: string | Date): LocalDateParts | null {
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const year = date.getFullYear()
  const month = padNumber(date.getMonth() + 1)
  const day = padNumber(date.getDate())
  const hours = padNumber(date.getHours())
  const minutes = padNumber(date.getMinutes())

  return {
    year,
    month,
    day,
    hours,
    minutes,
    dateKey: `${year}-${month}-${day}`,
    timeKey: `${hours}:${minutes}`,
  }
}

function toCsvValue(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value)
  const escaped = text.replace(/"/g, '""')
  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`
  }
  return escaped
}

export interface DayRangeResult {
  from: string | null
  to: string | null
}

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

export function exportToCSV(entries: TimeEntry[], from: string | Date, to: string | Date): void {
  const rows: (string | number)[][] = [
    [
      'Date',
      'Start time',
      'End time',
      'Duration (seconds)',
      'Duration (formatted)',
      'Project',
      'Description',
    ],
  ]

  entries.forEach((entry) => {
    const startParts = toLocalDateParts(entry.started_at)
    const stopParts = entry.stopped_at ? toLocalDateParts(entry.stopped_at) : null

    rows.push([
      startParts?.dateKey ?? '',
      startParts?.timeKey ?? '',
      stopParts?.timeKey ?? '',
      entry.duration_seconds ?? 0,
      formatDuration(entry.duration_seconds ?? 0),
      entry.projects?.name ?? '',
      entry.description ?? '',
    ])
  })

  const csv = rows.map((row) => row.map(toCsvValue).join(',')).join('\n')
  const fromKey = toLocalDateParts(from)?.dateKey ?? 'from'
  const toKey = toLocalDateParts(to)?.dateKey ?? 'to'
  const filename = `time-entries-${fromKey}-to-${toKey}.csv`

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const downloadUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(downloadUrl)
}
