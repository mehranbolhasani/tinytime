export const COLOR_PRESETS: readonly string[] = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#78716c', '#64748b', '#6b7280',
  '#92400e', '#166534', '#1e40af', '#581c87',
  '#881337', '#0f766e', '#c2410c', '#a16207',
]

const HEX_COLOR_REGEX = /^#([0-9a-f]{6})$/i

export function toSafeHexColor(color: unknown, fallback = '#94a3b8'): string {
  if (typeof color === 'string' && HEX_COLOR_REGEX.test(color)) {
    return color
  }

  return fallback
}

export function hexToRgba(hex: string, alpha: number): string {
  const safeHex = toSafeHexColor(hex)
  const clean = safeHex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const safeAlpha = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`
}

export interface HSV {
  h: number
  s: number
  v: number
}

export function hsvToHex(hsv: HSV): string {
  const { h, s, v } = hsv
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c

  let r = 0
  let g = 0
  let b = 0

  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function hexToHsv(hex: string): HSV {
  const safeHex = toSafeHexColor(hex)
  const clean = safeHex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min

  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }

  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}

export function isValidHex(hex: string): boolean {
  return HEX_COLOR_REGEX.test(hex)
}
