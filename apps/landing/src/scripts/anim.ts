import { animate, inView } from 'motion'

const presets = {
  fade: { opacity: [0, 1] },
  'fade-up': { opacity: [0, 1], y: [12, 0] },
  'fade-down': { opacity: [0, 1], y: [-12, 0] },
  'fade-left': { opacity: [0, 1], x: [12, 0] },
  'fade-right': { opacity: [0, 1], x: [-12, 0] },
  scale: { opacity: [0, 1], scale: [0.96, 1] },
  blur: { opacity: [0, 1], filter: ['blur(8px)', 'blur(0px)'] },
} as const

const parseMs = (value: string): number => {
  const trimmed = value.trim()
  if (!trimmed) return 0
  if (trimmed.endsWith('ms')) return Number.parseFloat(trimmed)
  if (trimmed.endsWith('s')) return Number.parseFloat(trimmed) * 1000
  return Number.parseFloat(trimmed)
}

const getParentStaggerDelay = (element: HTMLElement): number => {
  const parent = element.parentElement
  if (!parent) return 0

  const stagger = parseMs(getComputedStyle(parent).getPropertyValue('--anim-stagger'))
  if (stagger <= 0) return 0

  const siblings = Array.from(parent.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains('anim'),
  )

  const index = siblings.indexOf(element)
  if (index < 0) return 0

  return index * stagger
}

const revealImmediately = (elements: NodeListOf<HTMLElement>): void => {
  elements.forEach((element) => {
    element.style.opacity = '1'
    element.style.transform = 'none'
    element.style.filter = 'none'
  })
}

const elements = document.querySelectorAll<HTMLElement>('.anim')

if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  revealImmediately(elements)
} else {
  elements.forEach((element) => {
    const styles = getComputedStyle(element)
    const animationName = styles.getPropertyValue('--anim').trim() || 'fade-up'
    const preset = presets[animationName as keyof typeof presets] ?? presets['fade-up']
    const delayMs = parseMs(styles.getPropertyValue('--anim-delay')) + getParentStaggerDelay(element)
    const durationMs = parseMs(styles.getPropertyValue('--anim-duration')) || 600
    const easing = styles.getPropertyValue('--anim-easing').trim() || 'ease-out'

    let stopInView = (): void => {}

    stopInView = inView(
      element,
      () => {
        animate(element, preset, {
          duration: durationMs / 1000,
          delay: delayMs / 1000,
          ease: easing,
          fill: 'forwards',
        })
        stopInView()
      },
      { amount: 0.2 },
    )
  })
}
