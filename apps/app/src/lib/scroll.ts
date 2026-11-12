/**
 * Scrolls the given element and the window to the top on the next animation frame.
 * Uses `auto` when the user asks for reduced motion; otherwise `smooth`, unless an
 * explicit behaviour is passed (route changes scroll instantly with `auto`).
 */
export function scrollToTop(
  element?: HTMLElement | null,
  behavior?: ScrollBehavior
): void {
  if (typeof window === 'undefined') {
    return
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const resolvedBehavior = prefersReducedMotion ? 'auto' : behavior ?? 'smooth'

  window.requestAnimationFrame(() => {
    element?.scrollTo({ top: 0, behavior: resolvedBehavior })
    window.scrollTo({ top: 0, behavior: resolvedBehavior })
  })
}
