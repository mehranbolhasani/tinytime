import { useLayoutEffect, useState, type RefObject } from 'react'

/** Height per hour that makes 24 hours exactly fill the scroll area below the all-day row. */
export function useFitHourHeight(
  scrollRef: RefObject<HTMLElement | null>,
  allDayRef: RefObject<HTMLElement | null>
): number | null {
  const [fit, setFit] = useState<number | null>(null)

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return

    const measure = () => {
      const allDay = allDayRef.current?.offsetHeight ?? 0
      // 1px margin so 24 × fit never exceeds clientHeight through float rounding.
      const next = Math.max(0, (scrollEl.clientHeight - allDay - 1) / 24)
      setFit((prev) => (prev !== null && Math.abs(prev - next) < 0.5 ? prev : next))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(scrollEl)
    if (allDayRef.current) observer.observe(allDayRef.current)
    return () => observer.disconnect()
  }, [scrollRef, allDayRef])

  return fit
}
