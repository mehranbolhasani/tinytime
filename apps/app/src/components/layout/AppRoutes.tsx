import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import ErrorBoundary from '@/components/ErrorBoundary'
import { loadReportsPage } from '@/components/layout/prefetchReports'

const Today = lazy(() => import('@/pages/Today'))
const Calendar = lazy(() => import('@/pages/Calendar'))
const Reports = lazy(loadReportsPage)
const Projects = lazy(() => import('@/pages/Projects'))
const GoogleCallback = lazy(() => import('@/pages/GoogleCallback'))

const ROUTES = [
  { path: '/', Component: Today },
  { path: '/calendar', Component: Calendar },
  { path: '/reports', Component: Reports },
  { path: '/projects', Component: Projects },
  { path: '/google/callback', Component: GoogleCallback },
]

function RouteLoadingFallback() {
  return (
    <div className="rp-6 text-sm text-muted-foreground/70 w-full h-full grid place-items-center">
      Loading view...
    </div>
  )
}

export default function AppRoutes() {
  const location = useLocation()

  return (
    <ErrorBoundary key={location.pathname} scope={`route:${location.pathname}`}>
      <Routes location={location}>
        {ROUTES.map(({ path, Component }) => (
          <Route
            key={path}
            path={path}
            element={(
              <Suspense fallback={<RouteLoadingFallback />}>
                <Component />
              </Suspense>
            )}
          />
        ))}
      </Routes>
    </ErrorBoundary>
  )
}
