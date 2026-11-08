let pending: Promise<void> | null = null
const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

/**
 * Runs a timer action exclusively across the whole app.
 * If another action is in flight, returns that promise and does NOT run `action`.
 */
export function runTimerAction(action: () => Promise<void>): Promise<void> {
  if (pending) {
    return pending
  }

  pending = action().finally(() => {
    pending = null
    notify()
  })
  notify()
  return pending
}

export function isTimerActionPending(): boolean {
  return pending !== null
}

export function subscribeTimerAction(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
