import { useEffect, useMemo, useState } from 'react'
import type { ThemePreference } from '@/types'

const THEME_STORAGE_KEY = 'tinytime:theme'
const SYSTEM_THEME = 'system' as const
const LIGHT_THEME = 'light' as const
const DARK_THEME = 'dark' as const

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return LIGHT_THEME
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK_THEME : LIGHT_THEME
}

function readStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') {
    return SYSTEM_THEME
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === LIGHT_THEME || storedTheme === DARK_THEME || storedTheme === SYSTEM_THEME) {
    return storedTheme
  }

  return SYSTEM_THEME
}

function applyThemeToDocument(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') {
    return
  }

  const isDark = theme === DARK_THEME
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
}

interface UseThemeResult {
  preference: ThemePreference
  resolvedTheme: 'light' | 'dark'
  setThemePreference: (next: ThemePreference) => void
  options: ThemePreference[]
}

export function useTheme(): UseThemeResult {
  const [preference, setPreference] = useState<ThemePreference>(readStoredTheme)

  const resolvedTheme = useMemo(
    () => (preference === SYSTEM_THEME ? getSystemPreference() : preference),
    [preference]
  )

  useEffect(() => {
    applyThemeToDocument(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    if (preference !== SYSTEM_THEME) {
      return undefined
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = () => {
      applyThemeToDocument(getSystemPreference())
    }

    mediaQuery.addEventListener('change', handleSystemChange)
    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange)
    }
  }, [preference])

  const setThemePreference = (nextPreference: ThemePreference) => {
    setPreference(nextPreference)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference)
    }
  }

  return {
    preference,
    resolvedTheme,
    setThemePreference,
    options: [SYSTEM_THEME, LIGHT_THEME, DARK_THEME],
  }
}
