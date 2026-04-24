export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
}

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value))
  return new Response(JSON.stringify(body), { ...init, headers })
}

export function htmlResponse(body: string, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'text/html; charset=utf-8')
  Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value))
  return new Response(body, { ...init, headers })
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, { status })
}
