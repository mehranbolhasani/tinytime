import { vi } from 'vitest'

/**
 * Creates a chainable Supabase query builder mock.
 *
 * Every fluent method (select, insert, eq, …) returns the same chain object,
 * so the full Supabase builder pattern works regardless of call order.
 *
 * Terminal calls:
 *  - .single()      → resolves to `resolved`
 *  - .maybeSingle() → resolves to `resolved`
 *  - await chain    → resolves to `resolved` (via .then, handles delete/update without .single())
 */
export function createMockSupabaseChain(resolved = { data: null, error: null }) {
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
    then: (resolve, reject) => Promise.resolve(resolved).then(resolve, reject),
  }
  return chain
}

export function createMockSupabaseClient(resolved = { data: null, error: null }) {
  const chain = createMockSupabaseChain(resolved)
  return {
    from: vi.fn(() => chain),
    _chain: chain,
  }
}
