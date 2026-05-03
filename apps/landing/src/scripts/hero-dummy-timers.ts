import { animate, scroll } from 'motion'
import type {
  DOMKeyframesDefinition,
} from 'motion'

const animateElement = animate as (
  element: Element,
  keyframes: DOMKeyframesDefinition,
  options?: any,
) => any

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (!prefersReducedMotion) {
  const root = document.getElementById('hero-dummy-timers')

  if (root) {
    const parallaxTimers = Array.from(
      root.querySelectorAll<HTMLElement>('.hero-dummy-timer-parallax'),
    )

    parallaxTimers.forEach((timer, index) => {
      const from = Number.parseFloat(timer.dataset.parallaxFrom ?? '0')
      const to = Number.parseFloat(timer.dataset.parallaxTo ?? '0')
      const entry = timer.querySelector<HTMLElement>('.hero-dummy-timer-entry')

      if (!Number.isFinite(from) || !Number.isFinite(to) || !entry) return

      timer.style.willChange = 'transform'
      entry.style.opacity = '0'
      entry.style.transformOrigin = '50% 50%'
      entry.style.willChange = 'transform, opacity'

      animateElement(
        entry,
        {
          opacity: [0, 1],
          scale: [0.78, 1],
          y: [18, 0],
          rotateX: [10, 0],
        },
        {
          duration: 0.3,
          delay: index * 0.035,
          ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards',
        },
      )

      scroll(
        animateElement(
          timer,
          { y: [`${from}px`, `${to}px`] },
          {
            ease: 'linear',
          },
        ),
        {
          target: timer,
          offset: ['start end', 'end start'],
        },
      )
    })
  }
}
