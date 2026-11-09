import React from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FunctionsHttpError } from '@supabase/supabase-js'

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  assertSupabaseClient: () => ({ functions: { invoke: invokeMock } }),
  getFriendlySupabaseError: (_error, fallback) => fallback,
}))

import { GoogleConnectError, useCompleteGoogleConnection } from '../useGoogleCalendar.js'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function makeWrapper(queryClient) {
  return function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useCompleteGoogleConnection', () => {
  beforeEach(() => {
    invokeMock.mockReset()
  })

  it('invalidates the four Google query keys on success', async () => {
    const queryClient = makeQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null })

    const { result } = renderHook(
      () => useCompleteGoogleConnection(),
      { wrapper: makeWrapper(queryClient) }
    )

    await act(async () => {
      await result.current.mutateAsync({ code: 'code-1', state: 'state-1' })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['google_calendar', 'status'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['google_calendar', 'calendars'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['google_calendar', 'selections'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['google_calendar', 'events'] })
  })

  it('maps a FunctionsHttpError body to a GoogleConnectError code', async () => {
    const queryClient = makeQueryClient()
    const response = new Response(JSON.stringify({ error: 'wrong_account' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
    invokeMock.mockResolvedValue({ data: null, error: new FunctionsHttpError(response) })

    const { result } = renderHook(
      () => useCompleteGoogleConnection(),
      { wrapper: makeWrapper(queryClient) }
    )

    let caught
    await act(async () => {
      try {
        await result.current.mutateAsync({ code: 'code-2', state: 'state-2' })
      } catch (error) {
        caught = error
      }
    })

    expect(caught).toBeInstanceOf(GoogleConnectError)
    expect(caught.code).toBe('wrong_account')
  })

  it('maps any other error to unknown', async () => {
    const queryClient = makeQueryClient()
    invokeMock.mockResolvedValue({ data: null, error: new Error('network down') })

    const { result } = renderHook(
      () => useCompleteGoogleConnection(),
      { wrapper: makeWrapper(queryClient) }
    )

    let caught
    await act(async () => {
      try {
        await result.current.mutateAsync({ code: 'code-3', state: 'state-3' })
      } catch (error) {
        caught = error
      }
    })

    expect(caught).toBeInstanceOf(GoogleConnectError)
    expect(caught.code).toBe('unknown')
  })
})
