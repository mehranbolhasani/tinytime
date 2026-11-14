import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSwipeToClose } from '../useSwipeToClose'

function makeSheet(): HTMLDivElement {
  const sheet = document.createElement('div')
  document.body.appendChild(sheet)
  return sheet
}

function pointerEvent(clientY: number): React.PointerEvent<HTMLElement> {
  return {
    pointerType: 'touch',
    button: 0,
    pointerId: 1,
    clientY,
    currentTarget: { setPointerCapture: vi.fn() },
  } as unknown as React.PointerEvent<HTMLElement>
}

describe('useSwipeToClose', () => {
  let now = 1_000
  let nowSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.useFakeTimers()
    now = 1_000
    nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => now)
  })

  afterEach(() => {
    nowSpy.mockRestore()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('closes after a long downward drag', () => {
    const sheet = makeSheet()
    const onClose = vi.fn()
    const { result } = renderHook(() => useSwipeToClose({ current: sheet }, onClose))

    act(() => result.current.onPointerDown(pointerEvent(100)))
    now = 1_050
    act(() => result.current.onPointerMove(pointerEvent(220)))
    now = 1_100
    act(() => result.current.onPointerUp(pointerEvent(220)))

    expect(sheet.style.translate).toBe('0 100%')
    expect(sheet.dataset.swiped).toBe('true')
    expect(onClose).not.toHaveBeenCalled()

    // transitionend does not fire in jsdom; the fallback timer closes it.
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores a tiny fast flick', () => {
    const sheet = makeSheet()
    const onClose = vi.fn()
    const { result } = renderHook(() => useSwipeToClose({ current: sheet }, onClose))

    act(() => result.current.onPointerDown(pointerEvent(100)))
    now = 1_010
    act(() => result.current.onPointerMove(pointerEvent(110)))
    now = 1_020
    act(() => result.current.onPointerUp(pointerEvent(110)))

    // 10px at 1px/ms is fast, but below the 24px floor for a flick to count.
    expect(sheet.style.translate).toBe('0 0')

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(onClose).not.toHaveBeenCalled()
  })

  it('snaps back after a short slow drag', () => {
    const sheet = makeSheet()
    const onClose = vi.fn()
    const { result } = renderHook(() => useSwipeToClose({ current: sheet }, onClose))

    act(() => result.current.onPointerDown(pointerEvent(100)))
    now = 1_400
    act(() => result.current.onPointerMove(pointerEvent(140)))
    now = 1_400
    act(() => result.current.onPointerUp(pointerEvent(140)))

    expect(sheet.style.translate).toBe('0 0')
    expect(sheet.dataset.swiped).toBeUndefined()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(onClose).not.toHaveBeenCalled()
  })
})
