import { vi } from 'vitest'

interface MockResolved<T = unknown> {
  data: T | null
  error: unknown
}

export function createMockSupabaseChain<T = unknown>(resolved: MockResolved<T> = { data: null, error: null }) {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue(resolved),
    maybeSingle: vi.fn().mockResolvedValue(resolved),
    // Makes `await chain` work for operations that don't call .single()
    then: <R, Rej>(resolve: (v: MockResolved<T>) => R, reject: (e: unknown) => Rej) =>
      Promise.resolve(resolved).then(resolve, reject),
  }
  return chain
}

export function createMockSupabaseClient<T = unknown>(resolved: MockResolved<T> = { data: null, error: null }) {
  const chain = createMockSupabaseChain(resolved)
  return {
    from: vi.fn(() => chain),
    _chain: chain,
  }
}
