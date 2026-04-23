const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

const googleClientId = requiredEnv('GOOGLE_CLIENT_ID')
const googleClientSecret = requiredEnv('GOOGLE_CLIENT_SECRET')

function toIsoDate(ms: number) {
  return new Date(ms).toISOString()
}

export async function getIntegration(serviceClient: any, userId: string) {
  const { data, error } = await serviceClient
    .from('google_integrations')
    .select('user_id, access_token, refresh_token, access_token_expires_at, last_error')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message ?? 'Unable to load Google integration.')
  }

  return data
}

export async function markNeedsReconnect(serviceClient: any, userId: string) {
  const { error } = await serviceClient
    .from('google_integrations')
    .update({ last_error: 'needs_reconnect' })
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message ?? 'Unable to mark integration as disconnected.')
  }
}

export async function refreshAccessToken(serviceClient: any, userId: string, refreshToken: string) {
  const payload = new URLSearchParams({
    client_id: googleClientId,
    client_secret: googleClientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload,
  })

  const data = await response.json()

  if (!response.ok || !data.access_token) {
    if (data?.error === 'invalid_grant') {
      await markNeedsReconnect(serviceClient, userId)
      throw new Error('Google authorization expired. Please reconnect your calendar.')
    }

    throw new Error(data?.error_description ?? data?.error ?? 'Unable to refresh Google token.')
  }

  const expiresAt = data.expires_in ? toIsoDate(Date.now() + Number(data.expires_in) * 1000) : null
  const nextRefreshToken = data.refresh_token ?? refreshToken

  const { error } = await serviceClient
    .from('google_integrations')
    .update({
      access_token: data.access_token,
      refresh_token: nextRefreshToken,
      access_token_expires_at: expiresAt,
      last_error: null,
    })
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message ?? 'Unable to persist refreshed Google token.')
  }

  return data.access_token as string
}

function shouldRefreshToken(integration: any) {
  if (!integration?.access_token_expires_at) {
    return false
  }

  const expiresAtMs = new Date(integration.access_token_expires_at).getTime()
  if (Number.isNaN(expiresAtMs)) {
    return false
  }

  return expiresAtMs - Date.now() <= 60_000
}

export async function ensureGoogleAccessToken(serviceClient: any, userId: string) {
  const integration = await getIntegration(serviceClient, userId)
  if (!integration) {
    throw new Error('Google Calendar is not connected.')
  }

  if (integration.last_error === 'needs_reconnect') {
    throw new Error('Google authorization expired. Please reconnect your calendar.')
  }

  if (shouldRefreshToken(integration)) {
    if (!integration.refresh_token) {
      await markNeedsReconnect(serviceClient, userId)
      throw new Error('Google authorization expired. Please reconnect your calendar.')
    }

    return refreshAccessToken(serviceClient, userId, integration.refresh_token)
  }

  return integration.access_token as string
}

export async function googleFetch(url: string, accessToken: string) {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })
}
