import { describe, expect, it, vi } from 'vitest'
import { getFriendlySupabaseError } from '../supabase'

describe('getFriendlySupabaseError', () => {
  it('returns the expired-session message for JWT expired', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(getFriendlySupabaseError({ message: 'JWT expired' })).toBe(
      'Your session expired. Please sign in again.'
    )
  })

  it('returns the expired-session message for PGRST301', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(getFriendlySupabaseError({ code: 'PGRST301', message: 'JWT claim failed' })).toBe(
      'Your session expired. Please sign in again.'
    )
  })

  it('keeps the RLS message for row-level security errors', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(
      getFriendlySupabaseError({ message: 'new row violates row-level security policy' })
    ).toContain('Not authorized for this action')
  })

  it('passes unrelated messages through', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(getFriendlySupabaseError({ message: 'Something else broke' })).toBe(
      'Something else broke'
    )
  })
})
