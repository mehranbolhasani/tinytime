import type { Easing, Transition, Variants } from 'motion/react'

type BezierEasing = [number, number, number, number]
type SpringEasing = { type: 'spring'; stiffness: number; damping: number; mass: number }

export const easings: {
  standard: BezierEasing
  spring: SpringEasing
} = {
  // Mirrors apps/landing/src/styles/global.css --anim-easing
  standard: [0.22, 0.61, 0.36, 1],
  spring: { type: 'spring', stiffness: 380, damping: 32, mass: 0.6 },
}

export const durations = {
  short: 0.15,
  base: 0.25,
  long: 0.45,
}

export const variants: Record<string, Variants> = {
  fadeUp: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  popLayout: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  },
  listRow: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 4 },
  },
}

interface AnimationPreset {
  variants: Variants
  transition: Transition
}

export const presets: Record<string, AnimationPreset> = {
  route: {
    variants: {
      initial: { opacity: 0, y: 4 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -2 },
    },
    transition: { duration: durations.base, ease: easings.standard as Easing },
  },
  panelSwap: {
    variants: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    transition: { duration: durations.short, ease: easings.standard as Easing },
  },
  listItem: {
    variants: {
      initial: { opacity: 0, y: 6 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 4 },
    },
    transition: { duration: durations.short, ease: easings.standard as Easing },
  },
}
