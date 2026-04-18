import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Clock, CalendarDays, BarChart2, Folder, Menu, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { TimerProvider } from '@/contexts/TimerContext'
import { useTimerContext } from '@/contexts/TimerContext'
import { useViewport } from '@/hooks/useMediaQuery'
import { useTheme } from '@/hooks/useTheme'
import { formatDurationHMS } from '@/lib/utils'
import { assertSupabaseClient, getFriendlySupabaseError, supabaseConfigError } from '@/lib/supabase'
const Today = lazy(() => import('./pages/Today'))
const Calendar = lazy(() => import('./pages/Calendar'))
const loadReportsPage = () => import('./pages/Reports')
const Reports = lazy(loadReportsPage)
const Projects = lazy(() => import('./pages/Projects'))

const NAV_ITEMS = [
  { to: '/', label: 'Today', icon: Clock },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/reports', label: 'Reports', icon: BarChart2 },
  { to: '/projects', label: 'Projects', icon: Folder },
]

function ConfigErrorView() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Supabase is not configured</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {supabaseConfigError}
        </p>
        <p className="mt-4 text-sm text-muted-foreground/70">
          Add the missing environment variables in your `.env` file and restart the dev server.
        </p>
      </section>
    </main>
  )
}

function AuthView({
  email,
  onEmailChange,
  onSubmit,
  onSignInWithGithub,
  isSubmitting,
  isGithubSubmitting,
  notice,
  error,
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-background px-4 py-10 sm:p-6">
      <section className="w-full rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h1 className="text-lg font-semibold text-foreground">Sign in to tinytime</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use a magic link so your session can pass Supabase row-level security checks.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="you@example.com"
            required
            className="rounded-lg border-border bg-secondary focus:bg-background"
          />
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg"
          >
            {isSubmitting ? 'Sending link...' : 'Send magic link'}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground/70">
          <div className="h-px flex-1 bg-border" />
          <span>or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onSignInWithGithub}
          disabled={isGithubSubmitting}
          className="w-full rounded-lg border-border bg-secondary hover:bg-border"
        >
          {isGithubSubmitting ? 'Redirecting to GitHub...' : 'Continue with GitHub'}
        </Button>

        {notice ? <p className="mt-3 text-sm text-success">{notice}</p> : null}
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </section>
    </main>
  )
}

function ThemePreferenceToggle({ preference, options, onChange }) {
  return (
    <div className="rounded-xl border border-border bg-card p-1">
      <div className="grid grid-cols-3 gap-1">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            variant={preference === option ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onChange(option)}
            className="h-auto rounded-lg px-2 py-2 text-xs capitalize"
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  )
}

function AppLayout({ userEmail, onSignOut, isSigningOut }) {
  const { isDesktop } = useViewport()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { preference, setThemePreference, options } = useTheme()
  const timer = useTimerContext()
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false)
  const hasPrefetchedReports = useRef(false)

  const handlePrefetchReports = () => {
    if (hasPrefetchedReports.current) {
      return
    }

    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) {
      return
    }

    hasPrefetchedReports.current = true
    loadReportsPage()
  }

  const handleMiniTimerClick = () => {
    if (pathname !== '/') {
      navigate('/')
    }

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  const content = (
    <Suspense
      fallback={(
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground/70">
          Loading view...
        </div>
      )}
    >
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/projects" element={<Projects />} />
      </Routes>
    </Suspense>
  )

  const navLinks = NAV_ITEMS.map((item) => (
    <li key={item.to}>
      <NavLink
        to={item.to}
        end={item.to === '/'}
        onPointerEnter={item.to === '/reports' ? handlePrefetchReports : undefined}
        className={({ isActive }) =>
          `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-100 ${
            isActive
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`
        }
      >
        <item.icon className="h-4 w-4" />
        {item.label}
      </NavLink>
    </li>
  ))

  if (isDesktop) {
    return (
      <div className="flex min-h-screen gap-6 px-4 sm:px-6 lg:gap-8 lg:px-8">
        <div className="relative hidden w-[250px] lg:block">
          <aside className="relative top-8 z-40 flex h-fit flex-col rounded-xl bg-card">
            <div className="flex items-center gap-1 px-4 py-4">
              <span className="relative h-1.5 w-6 rounded-md bg-primary" />
              <span className="text-base font-normal text-foreground">tiny<span className="font-bold text-primary">time</span></span>
            </div>

            <nav className="px-4 py-4">
              <ul className="space-y-0.5">{navLinks}</ul>
            </nav>

            <div className="space-y-2 border-t border-border px-4 py-4">
              <ThemePreferenceToggle
                preference={preference}
                options={options}
                onChange={setThemePreference}
              />
              <p className="truncate text-xs text-muted-foreground/70">{userEmail}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSignOut}
                disabled={isSigningOut}
                className="w-full rounded-lg border-border bg-secondary"
              >
                {isSigningOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </aside>
        </div>

        <main className="flex-1 py-4">
          {content}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-1">
            <span className="relative h-1.5 w-6 rounded-md bg-primary" />
            <span className="text-base font-normal text-foreground">tiny<span className="font-bold text-primary">time</span></span>
          </div>

          <Sheet open={isAccountSheetOpen} onOpenChange={setIsAccountSheetOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Open account options"
                className="h-11 w-11 rounded-full text-muted-foreground hover:text-foreground"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="border-border px-5">
              <SheetHeader>
                <SheetTitle>Preferences</SheetTitle>
                <SheetDescription>Theme and account actions.</SheetDescription>
              </SheetHeader>
              <div className="space-y-4">
                <ThemePreferenceToggle
                  preference={preference}
                  options={options}
                  onChange={setThemePreference}
                />
                <p className="truncate text-sm text-muted-foreground">{userEmail}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSignOut}
                  disabled={isSigningOut}
                  className="w-full rounded-lg border-border bg-secondary"
                >
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-16 sm:px-6">
        {content}
      </main>

      {timer.isRunning ? (
        <Button
          type="button"
          variant="outline"
          onClick={handleMiniTimerClick}
          className="fixed inset-x-4 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 h-auto items-center justify-between rounded-xl border-border bg-card px-3 py-2 shadow-md sm:inset-x-6"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <PlayCircle className="h-4 w-4 text-primary" />
            Running timer
          </span>
          <span className="font-mono text-sm text-muted-foreground">{formatDurationHMS(timer.elapsed)}</span>
        </Button>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto grid max-w-xl grid-cols-4 px-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onPointerEnter={item.to === '/reports' ? handlePrefetchReports : undefined}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export default function App() {
  const supabase = useMemo(() => {
    if (supabaseConfigError) {
      return null
    }

    return assertSupabaseClient()
  }, [])
  const queryClient = useMemo(() => {
    const isMobileViewport =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches

    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          refetchOnWindowFocus: !isMobileViewport,
        },
      },
    })
  }, [])
  const [session, setSession] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(!supabaseConfigError)
  const [email, setEmail] = useState('')
  const [isSendingLink, setIsSendingLink] = useState(false)
  const [isSendingGithub, setIsSendingGithub] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [authNotice, setAuthNotice] = useState('')
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    let isCurrent = true

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!isCurrent) {
        return
      }

      if (error) {
        setAuthError(getFriendlySupabaseError(error, 'Unable to check your auth session.'))
        setSession(null)
      } else {
        setSession(data.session ?? null)
      }

      setIsAuthLoading(false)
    }

    loadSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null)
      setIsAuthLoading(false)
    })

    return () => {
      isCurrent = false
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  const handleSendMagicLink = async (event) => {
    event.preventDefault()
    if (!supabase) {
      return
    }

    setIsSendingLink(true)
    setAuthError('')
    setAuthNotice('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      setAuthError(getFriendlySupabaseError(error, 'Unable to send magic link.'))
    } else {
      setAuthNotice('Magic link sent. Check your inbox and open the link in this browser.')
    }

    setIsSendingLink(false)
  }

  const handleSignOut = async () => {
    if (!supabase) {
      return
    }

    setIsSigningOut(true)
    setAuthError('')

    const { error } = await supabase.auth.signOut()

    if (error) {
      setAuthError(getFriendlySupabaseError(error, 'Unable to sign out right now.'))
    }

    setIsSigningOut(false)
  }

  const handleSignInWithGithub = async () => {
    if (!supabase) {
      return
    }

    setIsSendingGithub(true)
    setAuthError('')
    setAuthNotice('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) {
      setAuthError(getFriendlySupabaseError(error, 'Unable to start GitHub sign-in.'))
      setIsSendingGithub(false)
      return
    }
  }

  if (supabaseConfigError) {
    return <ConfigErrorView />
  }

  if (isAuthLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">Checking your session...</p>
      </main>
    )
  }

  if (!session) {
    return (
      <AuthView
        email={email}
        onEmailChange={setEmail}
        onSubmit={handleSendMagicLink}
        onSignInWithGithub={handleSignInWithGithub}
        isSubmitting={isSendingLink}
        isGithubSubmitting={isSendingGithub}
        notice={authNotice}
        error={authError}
      />
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TimerProvider>
        <BrowserRouter>
          <AppLayout
            userEmail={session.user?.email ?? 'signed-in user'}
            onSignOut={handleSignOut}
            isSigningOut={isSigningOut}
          />
        </BrowserRouter>
      </TimerProvider>
    </QueryClientProvider>
  )
}
