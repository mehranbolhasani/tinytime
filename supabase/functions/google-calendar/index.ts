import { createServiceClient, requireUser } from '../_shared/auth.ts'
import { ensureGoogleAccessToken, googleFetch, markNeedsReconnect, refreshAccessToken } from '../_shared/google.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/http.ts'

type CalendarSelection = {
  calendar_id: string
  summary: string | null
  background_color: string | null
  enabled: boolean
}

async function googleJson(url: string, accessToken: string) {
  const response = await googleFetch(url, accessToken)
  const data = await response.json().catch(() => ({}))
  return { response, data }
}

async function callGoogleWithRefresh(serviceClient: any, userId: string, url: string) {
  let accessToken = await ensureGoogleAccessToken(serviceClient, userId)
  let { response, data } = await googleJson(url, accessToken)

  if (response.status === 401) {
    const { data: integration } = await serviceClient
      .from('google_integrations')
      .select('refresh_token')
      .eq('user_id', userId)
      .maybeSingle()

    if (!integration?.refresh_token) {
      await markNeedsReconnect(serviceClient, userId)
      throw new Error('Google authorization expired. Please reconnect your calendar.')
    }

    accessToken = await refreshAccessToken(serviceClient, userId, integration.refresh_token)
    ;({ response, data } = await googleJson(url, accessToken))
  }

  if (!response.ok) {
    if (response.status === 401 || data?.error?.status === 'UNAUTHENTICATED') {
      await markNeedsReconnect(serviceClient, userId)
      throw new Error('Google authorization expired. Please reconnect your calendar.')
    }

    const message =
      data?.error?.message ??
      data?.error_description ??
      `Google Calendar request failed with status ${response.status}.`
    const status = response.status === 429 ? 429 : 502
    throw Object.assign(new Error(message), { status })
  }

  return data
}

async function handleListCalendars(userId: string) {
  const serviceClient = createServiceClient()
  const url = new URL('https://www.googleapis.com/calendar/v3/users/me/calendarList')
  url.searchParams.set('showHidden', 'false')
  url.searchParams.set('maxResults', '250')

  const data = await callGoogleWithRefresh(serviceClient, userId, url.toString())
  const calendars = (data?.items ?? []).map((item: any) => ({
    id: item.id,
    summary: item.summary ?? 'Untitled calendar',
    backgroundColor: item.backgroundColor ?? '#64748b',
    primary: Boolean(item.primary),
  }))

  return calendars
}

async function readSelectedCalendars(serviceClient: any, userId: string): Promise<CalendarSelection[]> {
  const { data, error } = await serviceClient
    .from('google_calendar_selections')
    .select('calendar_id, summary, background_color, enabled')
    .eq('user_id', userId)
    .eq('enabled', true)

  if (error) {
    throw new Error(error.message ?? 'Unable to load selected Google calendars.')
  }

  return data ?? []
}

async function handleEvents(userId: string, body: any) {
  const { timeMin, timeMax, calendarIds = [] } = body ?? {}
  if (!timeMin || !timeMax) {
    throw new Error('Missing required fields: timeMin and timeMax.')
  }

  const serviceClient = createServiceClient()
  let selectedIds = [...new Set((calendarIds ?? []).filter(Boolean))]
  if (selectedIds.length === 0) {
    const selectedRows = await readSelectedCalendars(serviceClient, userId)
    selectedIds = selectedRows.map((item) => item.calendar_id)
  }

  if (selectedIds.length === 0) {
    return []
  }

  const events: any[] = []

  for (const calendarId of selectedIds) {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
    url.searchParams.set('timeMin', timeMin)
    url.searchParams.set('timeMax', timeMax)
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('maxResults', '250')

    const data = await callGoogleWithRefresh(serviceClient, userId, url.toString())
    const items = data?.items ?? []

    for (const item of items) {
      events.push({
        id: item.id,
        status: item.status,
        summary: item.summary ?? '',
        description: item.description ?? '',
        transparency: item.transparency ?? 'opaque',
        attendees: item.attendees ?? [],
        start: item.start,
        end: item.end,
        htmlLink: item.htmlLink ?? null,
        calendarId,
      })
    }
  }

  return events
}

async function handleStatus(userId: string) {
  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('google_integrations')
    .select('google_email, scopes, connected_at, last_error')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message ?? 'Unable to load Google connection status.')
  }

  if (!data) {
    return { connected: false, google_email: null, scopes: null, connected_at: null, needs_reconnect: false }
  }

  return {
    connected: true,
    google_email: data.google_email ?? null,
    scopes: data.scopes ?? null,
    connected_at: data.connected_at ?? null,
    needs_reconnect: data.last_error === 'needs_reconnect',
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405)
  }

  const user = await requireUser(request)
  if (!user) {
    return errorResponse('Unauthorized', 401)
  }

  try {
    const body = await request.json().catch(() => ({}))
    const action = body?.action

    if (action === 'status') {
      const status = await handleStatus(user.id)
      return jsonResponse(status)
    }

    if (action === 'list') {
      const calendars = await handleListCalendars(user.id)
      return jsonResponse({ calendars })
    }

    if (action === 'events') {
      const events = await handleEvents(user.id, body)
      return jsonResponse({ events })
    }

    return errorResponse('Unsupported action.', 400)
  } catch (error) {
    const status = (error as { status?: number })?.status ?? 500
    return errorResponse(error instanceof Error ? error.message : 'Unexpected server error.', status)
  }
})
