import { describe, it, expect, vi } from 'vitest'
import {
  isTimerActionPending,
  runTimerAction,
  subscribeTimerAction,
  trackRunningEntryEdit,
  waitForRunningEntryEdits,
} from '../timerActionLock.js'

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('timerActionLock', () => {
  it('ignores a second action while the first is pending and returns the same promise', async () => {
    const gate = createDeferred()
    const firstAction = vi.fn(() => gate.promise)
    const secondAction = vi.fn(() => Promise.resolve())

    const first = runTimerAction(firstAction)
    const second = runTimerAction(secondAction)

    expect(second).toBe(first)
    expect(secondAction).not.toHaveBeenCalled()

    gate.resolve()
    await first
  })

  it('reports pending while the action runs and clears it after it settles', async () => {
    const gate = createDeferred()

    const promise = runTimerAction(() => gate.promise)
    expect(isTimerActionPending()).toBe(true)

    gate.resolve()
    await promise
    expect(isTimerActionPending()).toBe(false)
  })

  it('clears pending state when the action rejects', async () => {
    const gate = createDeferred()

    const promise = runTimerAction(() => gate.promise)
    expect(isTimerActionPending()).toBe(true)

    gate.reject(new Error('boom'))

    await expect(promise).rejects.toThrow('boom')
    expect(isTimerActionPending()).toBe(false)
  })

  it('waits for nothing when no edits are tracked', async () => {
    await expect(waitForRunningEntryEdits()).resolves.toBeUndefined()
  })

  it('waits for a tracked edit to settle', async () => {
    const gate = createDeferred()
    let settled = false

    trackRunningEntryEdit(gate.promise)
    const waiting = waitForRunningEntryEdits().then(() => {
      settled = true
    })

    await Promise.resolve()
    expect(settled).toBe(false)

    gate.resolve()
    await waiting
    expect(settled).toBe(true)
  })

  it('does not reject when a tracked edit rejects', async () => {
    const gate = createDeferred()
    trackRunningEntryEdit(gate.promise)

    const waiting = waitForRunningEntryEdits()
    gate.reject(new Error('boom'))

    await expect(waiting).resolves.toBeUndefined()
  })

  it('notifies subscribers on start and on settle', async () => {
    const listener = vi.fn()
    const unsubscribe = subscribeTimerAction(listener)
    const gate = createDeferred()

    const promise = runTimerAction(() => gate.promise)
    expect(listener).toHaveBeenCalledTimes(1)

    gate.resolve()
    await promise
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
  })
})
