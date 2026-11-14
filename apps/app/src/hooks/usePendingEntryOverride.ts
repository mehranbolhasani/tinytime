import { useCallback, useMemo, useState } from 'react'
import { applyEntryOverride, entriesReflectOverride, type EntryOverride } from '@/lib/calendar'
import type { TimeEntry } from '@/types'

/**
 * Holds a locally committed entry time until the query cache contains it, so a
 * move is drawn at its new place instead of snapping back for a frame.
 *
 * The override is dropped while rendering — in the same pass that delivers the
 * new cache array, before the browser paints — rather than in an effect, which
 * would leave one frame drawn from the stale cache.
 */
export function usePendingEntryOverride(entries: TimeEntry[]) {
  const [override, setOverride] = useState<EntryOverride | null>(null)

  if (override && entriesReflectOverride(entries, override)) {
    setOverride(null)
  }

  const entriesForRendering = useMemo(() => applyEntryOverride(entries, override), [entries, override])
  const clearOverride = useCallback(() => setOverride(null), [])

  return { entriesForRendering, override, setOverride, clearOverride }
}
