let hasPrefetchedReports = false

export const loadReportsPage = () => import('@/pages/Reports')

export function prefetchReports() {
  if (hasPrefetchedReports) {
    return
  }

  if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) {
    return
  }

  hasPrefetchedReports = true
  loadReportsPage()
}
