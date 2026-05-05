import { toSafeHexColor } from '@/lib/color'
import type { GoogleCalendar, NormalizedGoogleEvent } from '@/types'

interface GoogleEventDate {
  date?: string
  dateTime?: string
}

interface GoogleEventAttendee {
  self?: boolean
  responseStatus?: string
}

interface RawGoogleEvent {
  id?: string
  calendarId?: string
  calendarColor?: string
  status?: string
  transparency?: string
  summary?: string
  description?: string
  htmlLink?: string
  start?: GoogleEventDate
  end?: GoogleEventDate
  attendees?: GoogleEventAttendee[]
}

function parseAllDayDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function parseTimedDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function isDeclinedBySelf(attendees: GoogleEventAttendee[] = []): boolean {
  return attendees.some((attendee) => attendee?.self && attendee?.responseStatus === 'declined')
}

export function normalizeGoogleEvent(event: RawGoogleEvent): NormalizedGoogleEvent | null {
  if (
    !event ||
    event.status !== 'confirmed' ||
    event.transparency === 'transparent' ||
    isDeclinedBySelf(event.attendees)
  ) {
    return null
  }

  const isAllDay = Boolean(event.start?.date && event.end?.date)
  const startDate = isAllDay
    ? parseAllDayDate(event.start?.date)
    : parseTimedDate(event.start?.dateTime)
  const endDate = isAllDay
    ? parseAllDayDate(event.end?.date)
    : parseTimedDate(event.end?.dateTime)

  if (!startDate || !endDate || endDate.getTime() <= startDate.getTime()) {
    return null
  }

  return {
    id: event.id ?? '',
    calendarId: event.calendarId ?? '',
    calendarColor: toSafeHexColor(event.calendarColor, '#60a5fa'),
    title: event.summary?.trim() || 'Untitled event',
    description: event.description ?? '',
    startedAt: startDate.toISOString(),
    stoppedAt: endDate.toISOString(),
    isAllDay,
    htmlLink: event.htmlLink ?? null,
  }
}

export function normalizeGoogleEvents(
  events: RawGoogleEvent[] = [],
  calendars: GoogleCalendar[] = []
): NormalizedGoogleEvent[] {
  const calendarById = calendars.reduce<Record<string, GoogleCalendar>>((acc, calendar) => {
    if (calendar?.id) {
      acc[calendar.id] = calendar
    }
    return acc
  }, {})

  return events
    .map((event) => {
      const calendar = event.calendarId ? calendarById[event.calendarId] : undefined
      const merged: RawGoogleEvent = {
        ...event,
        calendarColor: calendar?.backgroundColor ?? event.calendarColor,
      }
      return normalizeGoogleEvent(merged)
    })
    .filter((e): e is NormalizedGoogleEvent => e !== null)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
}
