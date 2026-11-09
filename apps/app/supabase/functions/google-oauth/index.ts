import { createServiceClient, requireUser } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/http.ts'
import { getDefaultOrigin, isAllowedOrigin } from '../_shared/origins.ts'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const CALENDAR_READONLY_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

const googleClientId = requiredEnv('GOOGLE_CLIENT_ID')
const googleClientSecret = requiredEnv('GOOGLE_CLIENT_SECRET')
const googleRedirectUri = requiredEnv('GOOGLE_REDIRECT_URI')

function base64UrlEncode(input: string) {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function randomString(size = 48) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  return Array.from(bytes, (value) => chars[value % chars.length]).join('')
}

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return base64UrlEncode(String.fromCharCode(...bytes))
}

async function sha256(input: string) {
  const encoded = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  const chars = Array.from(new Uint8Array(digest), (byte) => String.fromCharCode(byte)).join('')
  return base64UrlEncode(chars)
}

function redirectTo(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  })
}

function calendarResultUrl(origin: string, result: 'connected' | 'error', reason?: string): string {
  const url = new URL('/calendar', origin)
  url.searchParams.set('google', result)
  if (reason) url.searchParams.set('reason', reason)
  return url.toString()
}

async function exchangeCode(code: string, codeVerifier: string) {
  const payload = new URLSearchParams({
    code,
    client_id: googleClientId,
    client_secret: googleClientSecret,
    redirect_uri: googleRedirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  })

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload,
  })

  const data = await response.json()
  if (!response.ok || !data.access_token) {
    throw new Error(data?.error_description ?? data?.error ?? 'Unable to exchange Google auth code.')
  }

  return data
}

async function readGoogleUser(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    return {
      sub: '',
      email: null,
    }
  }

  const data = await response.json()
  return {
    sub: data?.sub ?? '',
    email: data?.email ?? null,
  }
}

async function handleStart(request: Request) {
  const user = await requireUser(request)
  if (!user) {
    return errorResponse('unauthorized', 401)
  }

  const origin = request.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return errorResponse('origin_not_allowed', 403)
  }

  const verifier = randomString(64)
  const challenge = await sha256(verifier)
  const state = randomState()

  const serviceClient = createServiceClient()

  // One pending request per user.
  await serviceClient.from('google_oauth_requests').delete().eq('user_id', user.id)

  const { error: insertError } = await serviceClient.from('google_oauth_requests').insert({
    state,
    user_id: user.id,
    code_verifier: verifier,
    app_origin: origin,
  })

  if (insertError) {
    console.error('[google-oauth] failed to store pending request', insertError)
    return errorResponse('start_failed', 500)
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', googleClientId)
  authUrl.searchParams.set('redirect_uri', googleRedirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', `openid email profile ${CALENDAR_READONLY_SCOPE}`)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('include_granted_scopes', 'true')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  return jsonResponse({
    url: authUrl.toString(),
  })
}

async function handleCallback(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  if (!state) {
    return redirectTo(calendarResultUrl(getDefaultOrigin(), 'error', 'invalid_request'))
  }

  const serviceClient = createServiceClient()
  const { data: row, error: lookupError } = await serviceClient
    .from('google_oauth_requests')
    .select('app_origin, expires_at')
    .eq('state', state)
    .maybeSingle()

  if (lookupError) {
    console.error('[google-oauth] failed to look up pending request', lookupError)
    return redirectTo(calendarResultUrl(getDefaultOrigin(), 'error', 'invalid_request'))
  }

  const expiresAtMs = row?.expires_at ? Date.parse(row.expires_at) : Number.NaN
  if (!row || !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return redirectTo(calendarResultUrl(getDefaultOrigin(), 'error', 'expired'))
  }

  if (!isAllowedOrigin(row.app_origin)) {
    return redirectTo(calendarResultUrl(getDefaultOrigin(), 'error', 'invalid_request'))
  }

  const appOrigin = row.app_origin

  if (oauthError) {
    await serviceClient.from('google_oauth_requests').delete().eq('state', state)
    const reason = oauthError === 'access_denied' ? 'denied' : 'google_error'
    return redirectTo(calendarResultUrl(appOrigin, 'error', reason))
  }

  if (!code) {
    await serviceClient.from('google_oauth_requests').delete().eq('state', state)
    return redirectTo(calendarResultUrl(appOrigin, 'error', 'invalid_request'))
  }

  const target = new URL('/google/callback', appOrigin)
  target.searchParams.set('code', code)
  target.searchParams.set('state', state)
  return redirectTo(target.toString())
}

async function handleComplete(request: Request) {
  const user = await requireUser(request)
  if (!user) {
    return errorResponse('unauthorized', 401)
  }

  const body = await request.json().catch(() => null)
  const code = body?.code
  const state = body?.state

  const isValidValue = (value: unknown): value is string =>
    typeof value === 'string' && value.length > 0 && value.length <= 2048

  if (!isValidValue(code) || !isValidValue(state)) {
    return errorResponse('invalid_request', 400)
  }

  const serviceClient = createServiceClient()
  const { data: row, error: lookupError } = await serviceClient
    .from('google_oauth_requests')
    .select('user_id, code_verifier, expires_at')
    .eq('state', state)
    .maybeSingle()

  if (lookupError) {
    console.error('[google-oauth] failed to look up pending request', lookupError)
  }

  if (!row) {
    return errorResponse('expired', 400)
  }

  if (row.user_id !== user.id) {
    console.warn('[google-oauth] state/user mismatch', { stateUser: row.user_id, jwtUser: user.id })
    return errorResponse('wrong_account', 403)
  }

  // Single use: consume the row before exchanging the code so it cannot be replayed.
  const { error: deleteError } = await serviceClient
    .from('google_oauth_requests')
    .delete()
    .eq('state', state)

  if (deleteError) {
    console.error('[google-oauth] failed to consume pending request', deleteError)
    return errorResponse('server_error', 500)
  }

  const expiresAtMs = row.expires_at ? Date.parse(row.expires_at) : Number.NaN
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return errorResponse('expired', 400)
  }

  let tokenData
  let userInfo
  try {
    tokenData = await exchangeCode(code, row.code_verifier)
    userInfo = await readGoogleUser(tokenData.access_token)
  } catch (error) {
    console.error('[google-oauth] code exchange failed', error)
    return errorResponse('exchange_failed', 502)
  }

  const scopes = tokenData.scope ?? ''
  if (!scopes.includes(CALENDAR_READONLY_SCOPE)) {
    return errorResponse('scope_missing', 400)
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString()
    : null

  const { error: saveError } = await serviceClient.from('google_integrations').upsert(
    {
      user_id: user.id,
      google_sub: userInfo.sub || `sub-${user.id.slice(0, 8)}`,
      google_email: userInfo.email,
      scopes,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      access_token_expires_at: expiresAt,
      connected_at: new Date().toISOString(),
      last_error: null,
    },
    {
      onConflict: 'user_id',
    }
  )

  if (saveError) {
    console.error('[google-oauth] failed to save integration', saveError)
    return errorResponse('save_failed', 500)
  }

  return jsonResponse({ ok: true, google_email: userInfo.email })
}

async function handleDisconnect(request: Request) {
  const user = await requireUser(request)
  if (!user) {
    return errorResponse('unauthorized', 401)
  }

  const serviceClient = createServiceClient()
  const { data: integration } = await serviceClient
    .from('google_integrations')
    .select('access_token, refresh_token')
    .eq('user_id', user.id)
    .maybeSingle()

  const tokenToRevoke = integration?.refresh_token ?? integration?.access_token
  if (tokenToRevoke) {
    await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(tokenToRevoke)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }).catch(() => null)
  }

  const selectionsDelete = await serviceClient
    .from('google_calendar_selections')
    .delete()
    .eq('user_id', user.id)
  const integrationDelete = await serviceClient
    .from('google_integrations')
    .delete()
    .eq('user_id', user.id)

  const { error: requestDeleteError } = await serviceClient
    .from('google_oauth_requests')
    .delete()
    .eq('user_id', user.id)

  if (requestDeleteError) {
    // Log but do not fail the disconnect if pending-request cleanup fails.
    console.error('[google-oauth] failed to delete pending requests', requestDeleteError)
  }

  if (selectionsDelete.error || integrationDelete.error) {
    console.error('[google-oauth] disconnect failed', {
      selectionsError: selectionsDelete.error,
      integrationError: integrationDelete.error,
    })
    return errorResponse('disconnect_failed', 500)
  }

  return jsonResponse({ ok: true })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const pathname = new URL(request.url).pathname

  try {
    if (request.method === 'POST') {
      const body = await request.clone().json().catch(() => ({}))
      const action = body?.action

      if (action === 'start') {
        return handleStart(request)
      }

      if (action === 'complete') {
        return handleComplete(request)
      }

      if (action === 'disconnect') {
        return handleDisconnect(request)
      }
    }

    if (request.method === 'GET' && (pathname.endsWith('/callback') || pathname.endsWith('/google-oauth'))) {
      return handleCallback(request)
    }

    return errorResponse('not_found', 404)
  } catch (error) {
    console.error('[google-oauth] unexpected error', error)
    return errorResponse('server_error', 500)
  }
})
