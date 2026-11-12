/// <reference types="vite/client" />
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const missingVariables: string[] = []

if (!supabaseUrl) {
  missingVariables.push('VITE_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  missingVariables.push('VITE_SUPABASE_ANON_KEY')
}

export const supabaseConfigError: string | null =
  missingVariables.length > 0
    ? `Missing required environment variable(s): ${missingVariables.join(', ')}.`
    : null

const supabase: SupabaseClient<Database> | null = supabaseConfigError
  ? null
  : createClient<Database>(supabaseUrl!, supabaseAnonKey!)

export function assertSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(supabaseConfigError ?? 'Supabase client is not configured.')
  }

  return supabase
}

export function getFriendlySupabaseError(
  error: unknown,
  fallbackMessage?: string
): string {
  if (error) {
    console.error('[supabase]', error)
  }

  const rawMessage =
    (error as { message?: string } | null)?.message ?? fallbackMessage ?? 'Unexpected error.'

  if (
    (error as { code?: string } | null)?.code === '23505' &&
    rawMessage.includes('time_entries_one_running_per_user')
  ) {
    return 'A timer was already running, so it has been loaded instead.'
  }

  const errorCode = (error as { code?: string } | null)?.code
  if (errorCode === 'PGRST301' || rawMessage.includes('JWT expired')) {
    return 'Your session expired. Please sign in again.'
  }

  if (
    rawMessage.includes('row-level security policy') ||
    rawMessage.includes('permission denied')
  ) {
    return 'Not authorized for this action. If you are signed in, your Supabase RLS policies likely need to allow this table for auth.uid().'
  }

  return rawMessage
}
