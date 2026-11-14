import { useRef, type RefObject } from 'react'

/**
 * Drag the sheet's handle down to close it. Only the handle area should attach
 * these handlers; the scrolling list below must keep its own gestures.
 */
export function useSwipeToClose(sheetRef: RefObject<HTMLElement | null>, onClose: () => void) {
  const startRef = useRef<{ y: number; t: number } | null>(null)

  const finish = (clientY: number) => {
    const start = startRef.current
    startRef.current = null
    const el = sheetRef.current
    if (!start || !el) return

    const dy = Math.max(0, clientY - start.y)
    const velocity = dy / Math.max(1, performance.now() - start.t)
    el.style.transition = 'translate 220ms cubic-bezier(0.32,0.72,0,1)'

    if (dy > 96 || (dy > 24 && velocity > 0.6)) {
      el.dataset.swiped = 'true' // disables the exit keyframe animation
      el.style.translate = '0 100%'
      let done = false
      const close = () => {
        if (!done) {
          done = true
          onClose()
        }
      }
      el.addEventListener('transitionend', close, { once: true })
      window.setTimeout(close, 300) // fallback if transitionend never fires
    } else {
      el.style.translate = '0 0'
    }
  }

  return {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      startRef.current = { y: event.clientY, t: performance.now() }
      event.currentTarget.setPointerCapture(event.pointerId)
      if (sheetRef.current) sheetRef.current.style.transition = 'none'
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      if (!startRef.current || !sheetRef.current) return
      const dy = Math.max(0, event.clientY - startRef.current.y)
      sheetRef.current.style.translate = `0 ${dy}px`
    },
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => finish(event.clientY),
    onPointerCancel: () => finish(startRef.current?.y ?? 0),
  }
}
