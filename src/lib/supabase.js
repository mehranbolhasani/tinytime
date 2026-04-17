import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const missingVariables = []

if (!supabaseUrl) {
  missingVariables.push('VITE_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  missingVariables.push('VITE_SUPABASE_ANON_KEY')
}

export const supabaseConfigError =
  missingVariables.length > 0
    ? `Missing required environment variable(s): ${missingVariables.join(', ')}.`
    : null

export const supabase = supabaseConfigError ? null : createClient(supabaseUrl, supabaseAnonKey)

export function assertSupabaseClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError ?? 'Supabase client is not configured.')
  }

  return supabase
}

export function getFriendlySupabaseError(error, fallbackMessage) {
  const rawMessage = error?.message ?? fallbackMessage ?? 'Unexpected error.'

  if (
    rawMessage.includes('row-level security policy') ||
    rawMessage.includes('JWT') ||
    rawMessage.includes('permission denied')
  ) {
    return 'Not authorized for this action. If you are signed in, your Supabase RLS policies likely need to allow this table for auth.uid().'
  }

  return rawMessage
}
