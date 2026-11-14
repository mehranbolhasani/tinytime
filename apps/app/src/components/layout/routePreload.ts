import type { ComponentType } from 'react'

type RouteModule = { default: ComponentType }

export const routeLoaders = {
  '/': () => import('@/pages/Today'),
  '/calendar': () => import('@/pages/Calendar'),
  '/reports': () => import('@/pages/Reports'),
  '/projects': () => import('@/pages/Projects'),
} satisfies Record<string, () => Promise<RouteModule>>

type PreloadablePath = keyof typeof routeLoaders
const started = new Set<string>()

export function preloadRoute(path: string): void {
  if (!(path in routeLoaders) || started.has(path)) return
  started.add(path)
  routeLoaders[path as PreloadablePath]().catch(() => started.delete(path))
}

/** Preloads every route chunk (and runs `extra`) once the browser is idle. Returns a cleanup. */
export function preloadAllRoutesWhenIdle(extra?: () => void): () => void {
  const run = () => {
    Object.keys(routeLoaders).forEach(preloadRoute)
    extra?.()
  }
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(run, { timeout: 2000 })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(run, 1200)
  return () => window.clearTimeout(id)
}
