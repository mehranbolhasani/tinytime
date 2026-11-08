const listeners = new Set<() => void>()
let timeoutId: number | null = null
let nowSeconds = Math.floor(Date.now() / 1000)

function scheduleNextTick(): void {
  const delay = 1000 - (Date.now() % 1000) + 5
  timeoutId = window.setTimeout(() => {
    nowSeconds = Math.floor(Date.now() / 1000)
    listeners.forEach((listener) => listener())
    scheduleNextTick()
  }, delay)
}

export function subscribeTicker(listener: () => void): () => void {
  listeners.add(listener)
  if (timeoutId === null) {
    nowSeconds = Math.floor(Date.now() / 1000)
    scheduleNextTick()
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timeoutId !== null) {
      window.clearTimeout(timeoutId)
      timeoutId = null
    }
  }
}

/** Snapshot for useSyncExternalStore. Stable between ticks while subscribed. */
export function getTickerNowSeconds(): number {
  if (timeoutId === null) {
    nowSeconds = Math.floor(Date.now() / 1000)
  }
  return nowSeconds
}

export function noopSubscribe(): () => void {
  return () => {}
}
