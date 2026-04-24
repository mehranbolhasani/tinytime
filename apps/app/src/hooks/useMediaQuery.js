import { useSyncExternalStore } from 'react'

export function useMediaQuery(query) {
  const subscribe = (callback) => {
    if (typeof window === 'undefined') {
      return () => {}
    }

    const mediaQuery = window.matchMedia(query)
    mediaQuery.addEventListener('change', callback)
    return () => {
      mediaQuery.removeEventListener('change', callback)
    }
  }

  const getSnapshot = () => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.matchMedia(query).matches
  }

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

export function useViewport() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return {
    isMobile,
    isTablet,
    isDesktop,
  }
}
