import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import ErrorBoundary from '@/components/ErrorBoundary'
import { PageShellSkeleton } from '@/components/layout/PageShell'
import { routeLoaders } from '@/components/layout/routePreload'

const Today = lazy(routeLoaders['/'])
const Calendar = lazy(routeLoaders['/calendar'])
const Reports = lazy(routeLoaders['/reports'])
const Projects = lazy(routeLoaders['/projects'])
const GoogleCallback = lazy(() => import('@/pages/GoogleCallback'))

const ROUTES = [
  { path: '/', Component: Today },
  { path: '/calendar', Component: Calendar },
  { path: '/reports', Component: Reports },
  { path: '/projects', Component: Projects },
  { path: '/google/callback', Component: GoogleCallback },
]

export default function AppRoutes() {
  const location = useLocation()

  return (
    <Suspense fallback={<PageShellSkeleton />}>
      <ErrorBoundary key={location.pathname} scope={`route:${location.pathname}`}>
        <Routes location={location}>
          {ROUTES.map(({ path, Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
        </Routes>
      </ErrorBoundary>
    </Suspense>
  )
}
