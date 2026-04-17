export const COLOR_PRESETS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#3b82f6',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
]

const HEX_COLOR_REGEX = /^#([0-9a-f]{6})$/i

export function toSafeHexColor(color, fallback = '#94a3b8') {
  if (typeof color === 'string' && HEX_COLOR_REGEX.test(color)) {
    return color
  }

  return fallback
}

export function hexToRgba(hex, alpha) {
  const safeHex = toSafeHexColor(hex)
  const clean = safeHex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const safeAlpha = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`
}
