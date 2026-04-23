import { createClient } from 'npm:@supabase/supabase-js@2'

function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

const supabaseUrl = requiredEnv('SUPABASE_URL')
const supabaseAnonKey = requiredEnv('SUPABASE_ANON_KEY')
const supabaseServiceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')

export function createRequestClient(request: Request) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: request.headers.get('Authorization') ?? '',
      },
    },
  })
}

export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey)
}

export async function requireUser(request: Request) {
  const client = createRequestClient(request)
  const { data, error } = await client.auth.getUser()

  if (error || !data.user) {
    return null
  }

  return data.user
}

export async function requireUserOrThrow(request: Request) {
  const user = await requireUser(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}
