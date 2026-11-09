import type { TimeEntry } from '@/types'

export function isOptimisticEntry(entry: Pick<TimeEntry, 'id'> | null | undefined): boolean {
  return Boolean(entry?.id?.startsWith('optimistic-'))
}

/** Whole seconds elapsed since `startedAt` at `nowMs`. Returns 0 for null or invalid input, never negative. */
export function computeElapsedSeconds(startedAt: string | null | undefined, nowMs: number): number {
  if (!startedAt) {
    return 0
  }

  const startedMs = new Date(startedAt).getTime()
  if (Number.isNaN(startedMs)) {
    return 0
  }

  return Math.max(0, Math.round((nowMs - startedMs) / 1000))
}
