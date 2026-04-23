import { createServiceClient, requireUser } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, htmlResponse, jsonResponse } from '../_shared/http.ts'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

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
const oauthStateSecret = requiredEnv('OAUTH_STATE_SECRET')

function base64UrlEncode(input: string) {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=')
  return atob(padded)
}

function randomString(size = 48) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  return Array.from(bytes, (value) => chars[value % chars.length]).join('')
}

async function sha256(input: string) {
  const encoded = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  const chars = Array.from(new Uint8Array(digest), (byte) => String.fromCharCode(byte)).join('')
  return base64UrlEncode(chars)
}

async function signPayload(payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(oauthStateSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const chars = Array.from(new Uint8Array(signature), (byte) => String.fromCharCode(byte)).join('')
  return base64UrlEncode(chars)
}

async function createState(payload: Record<string, unknown>) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = await signPayload(encodedPayload)
  return `${encodedPayload}.${signature}`
}

async function verifyState(rawState: string) {
  const parts = rawState.split('.')
  if (parts.length !== 2) {
    return null
  }

  const [encodedPayload, incomingSignature] = parts
  const expectedSignature = await signPayload(encodedPayload)
  if (incomingSignature !== expectedSignature) {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload))
    return payload
  } catch {
    return null
  }
}

function callbackResultHtml(ok: boolean, message = '', appOrigin = '') {
  const safeMessage = message || (ok ? 'Google Calendar connected successfully.' : 'Unable to connect Google Calendar.')
  const link = appOrigin ? `<a href="${appOrigin}" style="color:#2563eb;text-decoration:none;">Return to tinytime</a>` : ''
  const title = ok ? 'Google Calendar connected' : 'Google Calendar connection failed'

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
      .container { max-width: 520px; margin: 48px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
      h1 { font-size: 18px; margin: 0 0 10px; }
      p { font-size: 14px; line-height: 1.5; margin: 0 0 12px; color: #334155; }
    </style>
  </head>
  <body>
    <main class="container">
      <h1>${title}</h1>
      <p>${safeMessage}</p>
      <p>You can close this tab and return to tinytime.</p>
      ${link ? `<p>${link}</p>` : ''}
    </main>
  </body>
</html>`
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
    return errorResponse('Unauthorized', 401)
  }

  const { codeChallenge } = await request.json().catch(() => ({ codeChallenge: null }))
  const verifier = randomString(64)
  const challenge = codeChallenge || (await sha256(verifier))

  const state = await createState({
    userId: user.id,
    verifier,
    appOrigin: request.headers.get('origin') ?? '',
    createdAt: Date.now(),
  })

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', googleClientId)
  authUrl.searchParams.set('redirect_uri', googleRedirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/calendar.readonly')
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

  if (oauthError) {
    return htmlResponse(callbackResultHtml(false, `Google returned: ${oauthError}`), { status: 400 })
  }

  if (!code || !state) {
    return htmlResponse(callbackResultHtml(false, 'Missing OAuth callback parameters.'), { status: 400 })
  }

  const payload = await verifyState(state)
  if (!payload?.userId || !payload?.verifier || !payload?.createdAt) {
    return htmlResponse(callbackResultHtml(false, 'Invalid OAuth state.'), { status: 400 })
  }

  if (Date.now() - Number(payload.createdAt) > 10 * 60_000) {
    return htmlResponse(callbackResultHtml(false, 'This Google authorization request has expired.'), { status: 400 })
  }

  try {
    const tokenData = await exchangeCode(code, String(payload.verifier))
    const userInfo = await readGoogleUser(tokenData.access_token)
    const scopes = tokenData.scope ?? ''

    if (!scopes.includes('https://www.googleapis.com/auth/calendar.readonly')) {
      return htmlResponse(
        callbackResultHtml(
          false,
          'Calendar read permission was not granted. Please try again and accept the scope.',
          String(payload.appOrigin ?? '')
        ),
        { status: 400 }
      )
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString()
      : null

    const serviceClient = createServiceClient()
    const { error } = await serviceClient.from('google_integrations').upsert(
      {
        user_id: String(payload.userId),
        google_sub: userInfo.sub || `sub-${String(payload.userId).slice(0, 8)}`,
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

    if (error) {
      throw new Error(error.message ?? 'Unable to save Google integration.')
    }

    return htmlResponse(callbackResultHtml(true, '', String(payload.appOrigin ?? '')))
  } catch (error) {
    return htmlResponse(
      callbackResultHtml(false, error instanceof Error ? error.message : 'Unable to connect Google Calendar.', String(payload.appOrigin ?? '')),
      {
        status: 500,
      }
    )
  }
}

async function handleDisconnect(request: Request) {
  const user = await requireUser(request)
  if (!user) {
    return errorResponse('Unauthorized', 401)
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

  await serviceClient.from('google_calendar_selections').delete().eq('user_id', user.id)
  await serviceClient.from('google_integrations').delete().eq('user_id', user.id)

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

      if (action === 'disconnect') {
        return handleDisconnect(request)
      }
    }

    if (request.method === 'GET' && (pathname.endsWith('/callback') || pathname.endsWith('/google-oauth'))) {
      return handleCallback(request)
    }

    return errorResponse('Not found', 404)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unexpected server error.', 500)
  }
})
