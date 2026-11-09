import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabaseClient } from '@/test/mocks/supabase.js'
import { useProjects } from '../useProjects.js'

let mockClient = createMockSupabaseClient()

vi.mock('@/lib/supabase', () => ({
  assertSupabaseClient: () => mockClient,
  getFriendlySupabaseError: (_error, fallback) => fallback,
}))

const PROJECT = {
  id: 'project-1',
  name: 'Project',
  color: '#eab308',
  created_at: null,
}

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

describe('useProjects — entry invalidation', () => {
  let queryClient

  beforeEach(() => {
    queryClient = makeQueryClient()
    queryClient.setQueryData(['projects'], [PROJECT])
    queryClient.setQueryData(['time_entries', { from: 'a', to: 'b' }], [])
    mockClient = createMockSupabaseClient({ data: PROJECT, error: null })
  })

  it('invalidates time entries after a project update', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useProjects(), {
      wrapper: makeWrapper(queryClient),
    })

    await act(async () => {
      await result.current.updateProject(PROJECT.id, { name: 'Renamed' })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['time_entries'] })
  })

  it('invalidates time entries after a project delete', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useProjects(), {
      wrapper: makeWrapper(queryClient),
    })

    await act(async () => {
      await result.current.deleteProject(PROJECT.id)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['time_entries'] })
  })
})
