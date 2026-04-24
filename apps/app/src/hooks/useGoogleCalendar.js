import { useCallback, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assertSupabaseClient, getFriendlySupabaseError } from '@/lib/supabase'
import { normalizeGoogleEvents } from '@/lib/googleCalendar'

const GOOGLE_STATUS_QUERY_KEY = ['google_calendar', 'status']
const GOOGLE_CALENDARS_QUERY_KEY = ['google_calendar', 'calendars']
const GOOGLE_SELECTIONS_QUERY_KEY = ['google_calendar', 'selections']
const GOOGLE_EVENTS_QUERY_KEY = ['google_calendar', 'events']

function toUniqueSortedIds(ids = []) {
  return [...new Set(ids.filter(Boolean))].sort()
}

export function useGoogleCalendar() {
  const queryClient = useQueryClient()
  const supabase = assertSupabaseClient()

  const { data: connection = { connected: false, google_email: null, needs_reconnect: false }, isLoading: isLoadingConnection } = useQuery({
    queryKey: GOOGLE_STATUS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'status' },
      })

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to load Google Calendar connection status.'))
      }

      return data ?? { connected: false, google_email: null, needs_reconnect: false }
    },
  })

  const { data: calendars = [], isLoading: isLoadingCalendars } = useQuery({
    queryKey: GOOGLE_CALENDARS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'list' },
      })

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to load Google calendars.'))
      }

      return data?.calendars ?? []
    },
    enabled: Boolean(connection.connected && !connection.needs_reconnect),
  })

  const { data: selectedRows = [] } = useQuery({
    queryKey: GOOGLE_SELECTIONS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_calendar_selections')
        .select('calendar_id, enabled, summary, background_color')
        .order('summary', { ascending: true })

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to load selected calendars.'))
      }

      return data ?? []
    },
    enabled: Boolean(connection.connected),
  })

  const selectedCalendarIds = useMemo(
    () => toUniqueSortedIds(selectedRows.filter((row) => row.enabled).map((row) => row.calendar_id)),
    [selectedRows]
  )

  const selectedCalendarIdsKey = useMemo(() => selectedCalendarIds.join(','), [selectedCalendarIds])

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { action: 'start' },
      })

      if (error || !data?.url) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to start Google Calendar connection.'))
      }

      return data.url
    },
    onSuccess: async (url) => {
      await new Promise((resolve, reject) => {
        const authTab = window.open(url, '_blank')
        if (!authTab) {
          window.location.assign(url)
          resolve(null)
          return
        }

        const startAt = Date.now()
        const poll = window.setInterval(async () => {
          if (Date.now() - startAt > 180_000) {
            window.clearInterval(poll)
            reject(new Error('Google authorization timed out. Please try again.'))
            return
          }

          try {
            const { data, error } = await supabase.functions.invoke('google-calendar', {
              body: { action: 'status' },
            })

            if (error) {
              return
            }

            if (data?.connected) {
              window.clearInterval(poll)
              resolve(null)
            }
          } catch {
            // Keep polling for transient network errors.
          }
        }, 1500)
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: GOOGLE_STATUS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: GOOGLE_CALENDARS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: GOOGLE_SELECTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: GOOGLE_EVENTS_QUERY_KEY })
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('google-oauth', {
        body: { action: 'disconnect' },
      })

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to disconnect Google Calendar.'))
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: GOOGLE_STATUS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: GOOGLE_CALENDARS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: GOOGLE_SELECTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: GOOGLE_EVENTS_QUERY_KEY })
    },
  })

  const toggleCalendar = useCallback(
    async (calendar) => {
      const isEnabled = selectedCalendarIds.includes(calendar.id)

      const payload = {
        calendar_id: calendar.id,
        summary: calendar.summary ?? null,
        background_color: calendar.backgroundColor ?? null,
        enabled: !isEnabled,
      }

      const { error } = await supabase
        .from('google_calendar_selections')
        .upsert(payload, { onConflict: 'user_id,calendar_id' })

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to update selected calendars.'))
      }

      queryClient.invalidateQueries({ queryKey: GOOGLE_SELECTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: GOOGLE_EVENTS_QUERY_KEY })
    },
    [queryClient, selectedCalendarIds, supabase]
  )

  useEffect(() => {
    if (!connection.connected || connection.needs_reconnect) {
      return
    }

    if (isLoadingCalendars || calendars.length === 0 || selectedRows.length > 0) {
      return
    }

    const primaryCalendar = calendars.find((calendar) => calendar.primary) ?? calendars[0]
    if (!primaryCalendar) {
      return
    }

    const payload = {
      calendar_id: primaryCalendar.id,
      summary: primaryCalendar.summary ?? null,
      background_color: primaryCalendar.backgroundColor ?? null,
      enabled: true,
    }

    supabase
      .from('google_calendar_selections')
      .upsert(payload, { onConflict: 'user_id,calendar_id' })
      .then(({ error }) => {
        if (!error) {
          queryClient.invalidateQueries({ queryKey: GOOGLE_SELECTIONS_QUERY_KEY })
        }
      })
  }, [
    calendars,
    connection.connected,
    connection.needs_reconnect,
    isLoadingCalendars,
    queryClient,
    selectedRows.length,
    supabase,
  ])

  return {
    connection: {
      connected: Boolean(connection.connected),
      email: connection.google_email ?? null,
      needsReconnect: Boolean(connection.needs_reconnect),
    },
    calendars,
    selectedCalendarIds,
    selectedCalendarIdsKey,
    isLoadingConnection,
    isLoadingCalendars,
    connect: connectMutation.mutateAsync,
    disconnect: disconnectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    toggleCalendar,
  }
}

export function useGoogleEventsForRange({ from, to, selectedCalendarIds, calendars, enabled }) {
  const supabase = assertSupabaseClient()
  const selectedIds = useMemo(() => toUniqueSortedIds(selectedCalendarIds), [selectedCalendarIds])
  const selectedIdsKey = useMemo(() => selectedIds.join(','), [selectedIds])

  const { data, isLoading, error } = useQuery({
    queryKey: [...GOOGLE_EVENTS_QUERY_KEY, { from, to, selectedIdsKey }],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'events',
          timeMin: from,
          timeMax: to,
          calendarIds: selectedIds,
        },
      })

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to load Google Calendar events.'))
      }

      return normalizeGoogleEvents(data?.events ?? [], calendars)
    },
    enabled: Boolean(enabled && from && to && selectedIds.length > 0),
    staleTime: 60_000,
    retry: 2,
  })

  return {
    googleEvents: data ?? [],
    isLoadingGoogleEvents: isLoading,
    googleEventsError: error,
  }
}
