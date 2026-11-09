let pending: Promise<void> | null = null
const listeners = new Set<() => void>()
const runningEntryEdits = new Set<Promise<unknown>>()

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

/** Remember an in-flight edit of the running entry. */
export function trackRunningEntryEdit(promise: Promise<unknown>): void {
  const tracked = promise.catch(() => undefined)
  runningEntryEdits.add(tracked)
  void tracked.finally(() => {
    runningEntryEdits.delete(tracked)
  })
}

/** Resolves when every tracked edit has settled (success or failure). */
export function waitForRunningEntryEdits(): Promise<void> {
  return Promise.all([...runningEntryEdits]).then(() => undefined)
}
