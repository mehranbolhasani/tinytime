import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FRAME_THEME_COLORS, useTheme } from '../useTheme'

function stubMatchMedia() {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const list = {
    matches: false,
    media: '',
    onchange: null,
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener)
    },
    removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener)
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({ ...list, media: query }),
  })
}

function ensureThemeColorMeta(): HTMLMetaElement {
  const existing = document.querySelector('meta[name="theme-color"]')
  if (existing instanceof HTMLMetaElement) {
    return existing
  }

  const meta = document.createElement('meta')
  meta.setAttribute('name', 'theme-color')
  document.head.appendChild(meta)
  return meta
}

describe('useTheme', () => {
  beforeEach(() => {
    stubMatchMedia()
    window.localStorage.clear()
    document.head.innerHTML = ''
  })

  afterEach(() => {
    window.localStorage.clear()
    document.head.innerHTML = ''
  })

  it('keeps the theme-color meta in sync with the resolved theme', () => {
    const meta = ensureThemeColorMeta()
    const { result } = renderHook(() => useTheme())

    act(() => result.current.setThemePreference('dark'))

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(meta.getAttribute('content')).toBe(FRAME_THEME_COLORS.dark)

    act(() => result.current.setThemePreference('light'))

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(meta.getAttribute('content')).toBe(FRAME_THEME_COLORS.light)
  })

  it('matches the frame colours used by the app layout', () => {
    expect(FRAME_THEME_COLORS).toEqual({ light: '#1e1b4b', dark: '#f5f3f0' })
  })

  it('keeps the static bootstrap file in sync with FRAME_THEME_COLORS', () => {
    const source = readFileSync(join(process.cwd(), 'public/theme-init.js'), 'utf8')

    expect(source).toContain('meta[name="theme-color"]')
    expect(source).toContain(FRAME_THEME_COLORS.light)
    expect(source).toContain(FRAME_THEME_COLORS.dark)
  })
})
