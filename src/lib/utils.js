import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds) {
  const totalSeconds = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours === 0) {
    return `${minutes}m`
  }

  return `${hours}h ${minutes}m`
}

export function formatTime(dateString) {
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

export function formatDate(dateString) {
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

function getLocalDateKey(dateInput) {
  const date = new Date(dateInput)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function groupEntriesByDay(entries) {
  return entries.reduce((groups, entry) => {
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

export function computeDuration(startedAt, stoppedAt) {
  const startDate = new Date(startedAt)
  const stopDate = new Date(stoppedAt)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(stopDate.getTime())) {
    return 0
  }

  return Math.round((stopDate.getTime() - startDate.getTime()) / 1000)
}

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function toLocalDateParts(dateInput) {
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

function toCsvValue(value) {
  const text = value === null || value === undefined ? '' : String(value)
  const escaped = text.replace(/"/g, '""')
  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`
  }
  return escaped
}

export function exportToCSV(entries, entryTagsMap, from, to) {
  const rows = [
    [
      'Date',
      'Start time',
      'End time',
      'Duration (seconds)',
      'Duration (formatted)',
      'Project',
      'Description',
      'Tags',
    ],
  ]

  entries.forEach((entry) => {
    const startParts = toLocalDateParts(entry.started_at)
    const stopParts = toLocalDateParts(entry.stopped_at)
    const tagNames = (entryTagsMap?.[entry.id] ?? []).map((tag) => tag.name).join(';')

    rows.push([
      startParts?.dateKey ?? '',
      startParts?.timeKey ?? '',
      stopParts?.timeKey ?? '',
      entry.duration_seconds ?? 0,
      formatDuration(entry.duration_seconds ?? 0),
      entry.projects?.name ?? '',
      entry.description ?? '',
      tagNames,
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
