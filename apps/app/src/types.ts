export interface ProjectRef {
  id: string
  name: string
  color: string | null
}

export interface TimeEntry {
  id: string
  started_at: string
  stopped_at: string | null
  duration_seconds: number | null
  description: string | null
  project_id: string | null
  projects: ProjectRef | null
}

export interface Project {
  id: string
  name: string
  color: string | null
  hourly_rate: number | null
  created_at: string
}

export interface DayRange {
  from: string
  to: string
}

export interface CalendarBlock {
  entry: TimeEntry
  top: number
  height: number
  startMs: number
  endMs: number
  lane: 0 | 1
  hasOverlap: boolean
}

export interface NormalizedGoogleEvent {
  id: string
  calendarId: string
  calendarColor: string
  title: string
  description: string
  startedAt: string
  stoppedAt: string
  isAllDay: boolean
  htmlLink: string | null
}

export interface GoogleCalendar {
  id: string
  summary: string | null
  backgroundColor: string | null
  primary?: boolean
}

export interface GoogleCalendarConnection {
  connected: boolean
  email: string | null
  needsReconnect: boolean
}

export type ThemePreference = 'system' | 'light' | 'dark'
