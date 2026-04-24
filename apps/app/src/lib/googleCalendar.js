import { toSafeHexColor } from '@/lib/color'

function parseAllDayDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function parseTimedDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function isDeclinedBySelf(attendees = []) {
  return attendees.some((attendee) => attendee?.self && attendee?.responseStatus === 'declined')
}

export function normalizeGoogleEvent(event) {
  if (!event || event.status !== 'confirmed' || event.transparency === 'transparent' || isDeclinedBySelf(event.attendees)) {
    return null
  }

  const isAllDay = Boolean(event.start?.date && event.end?.date)
  const startDate = isAllDay ? parseAllDayDate(event.start?.date) : parseTimedDate(event.start?.dateTime)
  const endDate = isAllDay ? parseAllDayDate(event.end?.date) : parseTimedDate(event.end?.dateTime)

  if (!startDate || !endDate || endDate.getTime() <= startDate.getTime()) {
    return null
  }

  return {
    id: event.id,
    calendarId: event.calendarId,
    calendarColor: toSafeHexColor(event.calendarColor, '#60a5fa'),
    title: event.summary?.trim() || 'Untitled event',
    description: event.description ?? '',
    startedAt: startDate.toISOString(),
    stoppedAt: endDate.toISOString(),
    isAllDay,
    htmlLink: event.htmlLink ?? null,
  }
}

export function normalizeGoogleEvents(events = [], calendars = []) {
  const calendarById = calendars.reduce((acc, calendar) => {
    if (calendar?.id) {
      acc[calendar.id] = calendar
    }
    return acc
  }, {})

  return events
    .map((event) => {
      const calendar = calendarById[event.calendarId]
      const merged = {
        ...event,
        calendarColor: calendar?.backgroundColor ?? event.calendarColor,
      }
      return normalizeGoogleEvent(merged)
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
}
