/// <reference types="vite/client" />
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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

export const supabase: SupabaseClient | null = supabaseConfigError
  ? null
  : createClient(supabaseUrl!, supabaseAnonKey!)

export function assertSupabaseClient(): SupabaseClient {
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
    rawMessage.includes('row-level security policy') ||
    rawMessage.includes('JWT') ||
    rawMessage.includes('permission denied')
  ) {
    return 'Not authorized for this action. If you are signed in, your Supabase RLS policies likely need to allow this table for auth.uid().'
  }

  return rawMessage
}
