export function getAllowedOrigins(): string[] {
  const raw = Deno.env.get('APP_ALLOWED_ORIGINS') ?? ''
  const origins = raw.split(',').map((value) => value.trim().replace(/\/+$/, '')).filter(Boolean)
  if (origins.length === 0) {
    throw new Error('Missing environment variable: APP_ALLOWED_ORIGINS')
  }
  return origins
}

export function isAllowedOrigin(origin: string | null): origin is string {
  return Boolean(origin) && getAllowedOrigins().includes(origin!.replace(/\/+$/, ''))
}

/** First allowed origin; used when we can't tell where the user came from. */
export function getDefaultOrigin(): string {
  return getAllowedOrigins()[0]
}
