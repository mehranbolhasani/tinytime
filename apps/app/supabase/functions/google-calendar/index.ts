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

function createTokenProvider(serviceClient: any, userId: string) {
  let tokenPromise: Promise<string> | null = null
  let refreshPromise: Promise<string> | null = null

  return {
    get(): Promise<string> {
      tokenPromise ??= ensureGoogleAccessToken(serviceClient, userId)
      return tokenPromise
    },
    async refresh(): Promise<string> {
      refreshPromise ??= (async () => {
        const { data: integration } = await serviceClient
          .from('google_integrations')
          .select('refresh_token')
          .eq('user_id', userId)
          .maybeSingle()
        if (!integration?.refresh_token) {
          await markNeedsReconnect(serviceClient, userId)
          throw new Error('Google authorization expired. Please reconnect your calendar.')
        }
        const next = await refreshAccessToken(serviceClient, userId, integration.refresh_token)
        tokenPromise = Promise.resolve(next)
        return next
      })()
      return refreshPromise
    },
  }
}

type TokenProvider = ReturnType<typeof createTokenProvider>

async function callGoogleWithRefresh(
  tokens: TokenProvider,
  serviceClient: any,
  userId: string,
  url: string
) {
  let accessToken = await tokens.get()
  let { response, data } = await googleJson(url, accessToken)

  if (response.status === 401) {
    accessToken = await tokens.refresh()
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

  const tokens = createTokenProvider(serviceClient, userId)
  const data = await callGoogleWithRefresh(tokens, serviceClient, userId, url.toString())
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

async function fetchCalendarEvents(
  tokens: TokenProvider,
  serviceClient: any,
  userId: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
) {
  const events: any[] = []
  let pageToken: string | undefined

  for (let page = 0; page < 4; page += 1) {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
    url.searchParams.set('timeMin', timeMin)
    url.searchParams.set('timeMax', timeMax)
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('maxResults', '250')
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken)
    }

    const data = await callGoogleWithRefresh(tokens, serviceClient, userId, url.toString())
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

    pageToken = data?.nextPageToken
    if (!pageToken) {
      break
    }
  }

  return events
}

async function handleEvents(userId: string, body: any) {
  const { timeMin, timeMax, calendarIds = [] } = body ?? {}
  if (!timeMin || !timeMax) {
    throw new Error('Missing required fields: timeMin and timeMax.')
  }

  const serviceClient = createServiceClient()
  let selectedIds: string[] = [...new Set<string>((calendarIds ?? []).filter(Boolean))]
  if (selectedIds.length === 0) {
    const selectedRows = await readSelectedCalendars(serviceClient, userId)
    selectedIds = selectedRows.map((item) => item.calendar_id)
  }

  if (selectedIds.length === 0) {
    return []
  }

  const tokens = createTokenProvider(serviceClient, userId)
  const results = await Promise.allSettled(
    selectedIds.map((calendarId) =>
      fetchCalendarEvents(tokens, serviceClient, userId, calendarId, timeMin, timeMax)
    )
  )

  const fulfilled = results.filter(
    (result): result is PromiseFulfilledResult<any[]> => result.status === 'fulfilled'
  )
  const rejectedIds = selectedIds.filter((_, index) => results[index].status === 'rejected')

  if (fulfilled.length === 0) {
    const firstReason = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    )?.reason
    throw firstReason ?? new Error('Unable to load Google Calendar events.')
  }

  if (rejectedIds.length > 0) {
    console.warn('[google-calendar] failed to load some calendars', rejectedIds)
  }

  return fulfilled.flatMap((result) => result.value)
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
