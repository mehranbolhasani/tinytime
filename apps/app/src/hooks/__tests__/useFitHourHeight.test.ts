import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFitHourHeight } from '../useFitHourHeight'

interface ObserverInstance {
  callback: ResizeObserverCallback
  observed: Element[]
  disconnected: boolean
}

let observers: ObserverInstance[] = []

class MockResizeObserver {
  private instance: ObserverInstance

  constructor(callback: ResizeObserverCallback) {
    this.instance = { callback, observed: [], disconnected: false }
    observers.push(this.instance)
  }

  observe(element: Element) {
    this.instance.observed.push(element)
  }

  unobserve() {}

  disconnect() {
    this.instance.disconnected = true
  }
}

function elementWith(prop: 'clientHeight' | 'offsetHeight', value: number): HTMLDivElement {
  const element = document.createElement('div')
  Object.defineProperty(element, prop, { value, configurable: true })
  return element
}

function renderFit({ clientHeight, allDayHeight = 0 }: { clientHeight: number; allDayHeight?: number }) {
  const scrollEl = elementWith('clientHeight', clientHeight)
  const allDayEl = elementWith('offsetHeight', allDayHeight)
  const scrollRef = { current: scrollEl }
  const allDayRef = { current: allDayEl }

  const view = renderHook(() => useFitHourHeight(scrollRef, allDayRef))

  return { ...view, scrollEl, allDayEl }
}

describe('useFitHourHeight', () => {
  beforeEach(() => {
    observers = []
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('makes 24 hours exactly fill the scroll area', () => {
    const { result } = renderFit({ clientHeight: 961 })

    expect(result.current).toBe(40)
  })

  it('leaves room for the all-day row', () => {
    const { result } = renderFit({ clientHeight: 961, allDayHeight: 41 })

    expect(result.current).not.toBeNull()
    expect(Math.abs((result.current ?? 0) - 38.3)).toBeLessThan(0.01)
  })

  it('observes the scroll area and the all-day row', () => {
    renderFit({ clientHeight: 961, allDayHeight: 41 })

    expect(observers).toHaveLength(1)
    expect(observers[0].observed).toHaveLength(2)
  })

  it('re-measures when the observed size changes', () => {
    const { result, scrollEl } = renderFit({ clientHeight: 961 })
    expect(result.current).toBe(40)

    Object.defineProperty(scrollEl, 'clientHeight', { value: 481, configurable: true })

    act(() => {
      observers.forEach((observer) => observer.callback([], {} as ResizeObserver))
    })

    expect(result.current).toBe(20)
  })

  it('disconnects its observer on unmount', () => {
    const { unmount } = renderFit({ clientHeight: 961 })

    unmount()

    expect(observers[0].disconnected).toBe(true)
  })
})
