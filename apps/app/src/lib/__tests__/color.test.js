import { describe, it, expect } from 'vitest'
import { COLOR_PRESETS, toSafeHexColor, hexToRgba, hsvToHex, hexToHsv, isValidHex } from '../color.js'

// ---------------------------------------------------------------------------
// COLOR_PRESETS
// ---------------------------------------------------------------------------
describe('COLOR_PRESETS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(COLOR_PRESETS)).toBe(true)
    expect(COLOR_PRESETS.length).toBeGreaterThan(0)
  })

  it('every preset is a valid 6-digit lowercase hex color', () => {
    const valid = /^#[0-9a-f]{6}$/
    COLOR_PRESETS.forEach((color) => {
      expect(color).toMatch(valid)
    })
  })
})

// ---------------------------------------------------------------------------
// toSafeHexColor
// ---------------------------------------------------------------------------
describe('toSafeHexColor', () => {
  it('passes through a valid lowercase hex color', () => {
    expect(toSafeHexColor('#6366f1')).toBe('#6366f1')
  })

  it('accepts uppercase hex (regex is case-insensitive)', () => {
    expect(toSafeHexColor('#6366F1')).toBe('#6366F1')
  })

  it('returns the default fallback for an invalid string', () => {
    expect(toSafeHexColor('red')).toBe('#94a3b8')
    expect(toSafeHexColor('#fff')).toBe('#94a3b8')   // shorthand hex
    expect(toSafeHexColor('#gggggg')).toBe('#94a3b8') // non-hex chars
    expect(toSafeHexColor('')).toBe('#94a3b8')
  })

  it('returns the default fallback for non-string values', () => {
    expect(toSafeHexColor(undefined)).toBe('#94a3b8')
    expect(toSafeHexColor(null)).toBe('#94a3b8')
    expect(toSafeHexColor(123456)).toBe('#94a3b8')
  })

  it('uses a custom fallback when provided', () => {
    expect(toSafeHexColor('bad', '#000000')).toBe('#000000')
  })
})

// ---------------------------------------------------------------------------
// hexToRgba
// ---------------------------------------------------------------------------
describe('hexToRgba', () => {
  it('converts a valid hex color to an rgba string', () => {
    expect(hexToRgba('#ff0000', 1)).toBe('rgba(255, 0, 0, 1)')
    expect(hexToRgba('#000000', 1)).toBe('rgba(0, 0, 0, 1)')
    expect(hexToRgba('#ffffff', 1)).toBe('rgba(255, 255, 255, 1)')
  })

  it('applies a fractional alpha', () => {
    expect(hexToRgba('#6366f1', 0.5)).toBe('rgba(99, 102, 241, 0.5)')
  })

  it('clamps alpha above 1 to 1', () => {
    expect(hexToRgba('#ff0000', 1.5)).toBe('rgba(255, 0, 0, 1)')
  })

  it('clamps alpha below 0 to 0', () => {
    expect(hexToRgba('#ff0000', -0.5)).toBe('rgba(255, 0, 0, 0)')
  })

  it('defaults alpha to 1 when non-finite value is given', () => {
    expect(hexToRgba('#ff0000', NaN)).toBe('rgba(255, 0, 0, 1)')
    expect(hexToRgba('#ff0000', Infinity)).toBe('rgba(255, 0, 0, 1)')
  })

  it('falls back to the safe hex color for an invalid hex input', () => {
    // toSafeHexColor fallback is #94a3b8 → rgb(148, 163, 184)
    expect(hexToRgba('bad-color', 1)).toBe('rgba(148, 163, 184, 1)')
  })
})

// ---------------------------------------------------------------------------
// hsvToHex
// ---------------------------------------------------------------------------
describe('hsvToHex', () => {
  it('converts pure red', () => {
    expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe('#ff0000')
  })

  it('converts pure green', () => {
    expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe('#00ff00')
  })

  it('converts pure blue', () => {
    expect(hsvToHex({ h: 240, s: 1, v: 1 })).toBe('#0000ff')
  })

  it('converts black', () => {
    expect(hsvToHex({ h: 0, s: 0, v: 0 })).toBe('#000000')
  })

  it('converts white', () => {
    expect(hsvToHex({ h: 0, s: 0, v: 1 })).toBe('#ffffff')
  })

  it('converts a mid-tone color', () => {
    expect(hsvToHex({ h: 210, s: 0.5, v: 0.5 })).toBe('#406080')
  })
})

// ---------------------------------------------------------------------------
// hexToHsv
// ---------------------------------------------------------------------------
describe('hexToHsv', () => {
  it('converts pure red', () => {
    const hsv = hexToHsv('#ff0000')
    expect(hsv.h).toBeCloseTo(0, 0)
    expect(hsv.s).toBeCloseTo(1, 2)
    expect(hsv.v).toBeCloseTo(1, 2)
  })

  it('converts pure green', () => {
    const hsv = hexToHsv('#00ff00')
    expect(hsv.h).toBeCloseTo(120, 0)
    expect(hsv.s).toBeCloseTo(1, 2)
    expect(hsv.v).toBeCloseTo(1, 2)
  })

  it('converts pure blue', () => {
    const hsv = hexToHsv('#0000ff')
    expect(hsv.h).toBeCloseTo(240, 0)
    expect(hsv.s).toBeCloseTo(1, 2)
    expect(hsv.v).toBeCloseTo(1, 2)
  })

  it('converts black', () => {
    const hsv = hexToHsv('#000000')
    expect(hsv.v).toBeCloseTo(0, 2)
  })

  it('converts white', () => {
    const hsv = hexToHsv('#ffffff')
    expect(hsv.s).toBeCloseTo(0, 2)
    expect(hsv.v).toBeCloseTo(1, 2)
  })

  it('round-trips with hsvToHex', () => {
    const original = '#6366f1'
    const hsv = hexToHsv(original)
    const result = hsvToHex(hsv)
    expect(result).toBe(original)
  })
})

// ---------------------------------------------------------------------------
// isValidHex
// ---------------------------------------------------------------------------
describe('isValidHex', () => {
  it('returns true for valid lowercase hex', () => {
    expect(isValidHex('#ff0000')).toBe(true)
    expect(isValidHex('#000000')).toBe(true)
    expect(isValidHex('#ffffff')).toBe(true)
  })

  it('returns true for valid uppercase hex', () => {
    expect(isValidHex('#FF0000')).toBe(true)
    expect(isValidHex('#FFFFFF')).toBe(true)
  })

  it('returns false for invalid hex', () => {
    expect(isValidHex('#fff')).toBe(false)
    expect(isValidHex('ff0000')).toBe(false)
    expect(isValidHex('#gggggg')).toBe(false)
    expect(isValidHex('red')).toBe(false)
    expect(isValidHex('')).toBe(false)
  })
})
