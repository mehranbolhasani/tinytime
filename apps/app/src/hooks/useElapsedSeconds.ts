import { useSyncExternalStore } from 'react'
import { getTickerNowSeconds, noopSubscribe, subscribeTicker } from '@/lib/ticker'
import { computeElapsedSeconds } from '@/lib/timer'

/** Live elapsed seconds for a running entry. Subscribes to the ticker only while `startedAt` is set. */
export function useElapsedSeconds(startedAt: string | null | undefined): number {
  const nowSeconds = useSyncExternalStore(
    startedAt ? subscribeTicker : noopSubscribe,
    getTickerNowSeconds,
    getTickerNowSeconds
  )
  return startedAt ? computeElapsedSeconds(startedAt, nowSeconds * 1000) : 0
}
