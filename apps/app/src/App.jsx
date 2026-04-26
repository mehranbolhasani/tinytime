import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Clock, CalendarDays, BarChart2, Folder, Menu, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import GoogleCalendarSection from '@/components/settings/GoogleCalendarSection'
import { TimerProvider } from '@/contexts/TimerContext'
import { useTimerContext } from '@/contexts/TimerContext'
import { useTheme } from '@/hooks/useTheme'
import { generateNonce, initGoogleSignIn, loadGisScript, renderGoogleButton } from '@/lib/googleSignIn'
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

function GitHubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.38-1.33-1.75-1.33-1.75-1.09-.75.08-.74.08-.74 1.2.08 1.83 1.22 1.83 1.22 1.07 1.82 2.8 1.3 3.49.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.32-5.47-5.88 0-1.3.47-2.36 1.23-3.19-.12-.31-.53-1.54.12-3.21 0 0 1-.32 3.3 1.22a11.6 11.6 0 0 1 6 0c2.3-1.54 3.3-1.22 3.3-1.22.65 1.67.24 2.9.12 3.21.77.83 1.23 1.89 1.23 3.19 0 4.57-2.8 5.58-5.48 5.88.43.37.82 1.09.82 2.2v3.26c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  )
}

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
  googleButtonRef,
  googleConfigError,
  notice,
  error,
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full items-center justify-center bg-background px-4 py-10 sm:p-6">
      <div className="w-full max-w-sm flex flex-col items-center justify-center">
        <div>
          <div class="flex w-12 h-12 rounded-xl aspect-square items-center justify-center mx-auto bg-primary/10 mb-6 anim anim-scale anim-duration-700">
            <span class="h-2 w-6 rounded-sm bg-primary" />
          </div>
        </div>
        <section className="w-full max-w-md text-center">
          <h1 className="text-lg font-semibold text-foreground">Sign in to tinytime</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use a magic link!
          </p>
  
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border-border bg-secondary focus:bg-background"
            />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full w-[220px]"
            >
              {isSubmitting ? 'Sending link...' : 'Send magic link'}
            </Button>
          </form>
  
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground/70">
            <div className="h-px flex-1 bg-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
  
          <div className="flex flex-col items-center justify-center">
            <div className="flex min-h-10 w-[220px] items-center justify-center" ref={googleButtonRef} />
            {googleConfigError ? <p className="mt-2 text-xs text-destructive">{googleConfigError}</p> : null}
    
            <Button
              type="button"
              variant="outline"
              onClick={onSignInWithGithub}
              disabled={isGithubSubmitting}
              className="mt-3 w-[220px] rounded-full border-border bg-secondary hover:bg-border"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <GitHubIcon className="h-4 w-4" />
                {isGithubSubmitting ? 'Redirecting to GitHub...' : 'Continue with GitHub'}
              </span>
            </Button>
          </div>
  
          {notice ? <p className="mt-3 text-sm text-success">{notice}</p> : null}
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </section>
      </div>
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
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { preference, setThemePreference, options } = useTheme()
  const timer = useTimerContext()
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
    <li key={item.to} className="shrink-0">
      <NavLink
        to={item.to}
        end={item.to === '/'}
        onPointerEnter={item.to === '/reports' ? handlePrefetchReports : undefined}
        className={({ isActive }) =>
          `inline-flex items-center rounded-md px-4 py-3 text-sm font-normal transition-colors duration-100 ${
            isActive
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:text-foreground'
          }`
        }
      >
        <item.icon className="h-5 w-5" />
      </NavLink>
    </li>
  ))

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-[560px] px-4 pb-44 pt-5 sm:px-6">
        

        {content}
      </main>

      {timer.isRunning ? (
        <Button
          type="button"
          variant="outline"
          onClick={handleMiniTimerClick}
          className="fixed left-1/2 z-40 flex h-auto w-[calc(100%-2rem)] max-w-[512px] -translate-x-1/2 items-center justify-between rounded-lg border-border bg-card px-3 py-2 shadow-sm"
          style={{ bottom: 'calc(7rem + env(safe-area-inset-bottom))' }}
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <PlayCircle className="h-4 w-4 text-primary" />
            Running timer
          </span>
          <span className="font-mono text-sm text-muted-foreground">{formatDurationHMS(timer.elapsed)}</span>
        </Button>
      ) : null}

        <header className="fixed bottom-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 flex items-center justify-between bg-card/95 px-4 py-2 backdrop-blur shadow-xl shadow-primary/10 rounded-xl">
          <div className="inline-flex items-center gap-1">
            <span className="relative h-1.5 w-4 rounded-sm bg-primary" />
            <span className="text-base font-normal tracking-tight text-foreground">
              tiny<span className="text-primary">time</span>
            </span>
          </div>

          <nav className="">
            <ul className="flex items-center justify-between gap-1">
              {navLinks}
            </ul>
          </nav>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Open account options"
                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="z-50 w-[280px] space-y-3 rounded-lg border-border p-3 shadow-sm">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Preferences</p>
                <p className="text-xs text-muted-foreground">Theme and account actions.</p>
              </div>
              <div className="space-y-3">
                <ThemePreferenceToggle
                  preference={preference}
                  options={options}
                  onChange={setThemePreference}
                />
                <GoogleCalendarSection />
                <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSignOut}
                  disabled={isSigningOut}
                  className="h-8 w-full rounded-md border-border bg-secondary text-sm"
                >
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </header>

      
    </div>
  )
}

export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const googleConfigError = googleClientId
    ? null
    : 'Missing required environment variable: VITE_GOOGLE_CLIENT_ID.'
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
  const googleButtonRef = useRef(null)
  const googleNonceRef = useRef('')

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

  const handleGoogleCredential = useCallback(async (credential) => {
    if (!supabase) {
      return
    }

    setAuthError('')
    setAuthNotice('')

    if (!credential) {
      setAuthError('Google sign-in did not return a credential. Please try again.')
      return
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: credential,
      nonce: googleNonceRef.current,
    })

    if (error) {
      setAuthError(getFriendlySupabaseError(error, 'Unable to complete Google sign-in.'))
    }
  }, [supabase])

  useEffect(() => {
    if (session || !supabase || !googleClientId || !googleButtonRef.current) {
      return undefined
    }

    let isCancelled = false

    const setupGoogleSignIn = async () => {
      try {
        await loadGisScript()
        const { nonce, hashedNonce } = await generateNonce()

        if (isCancelled) {
          return
        }

        googleNonceRef.current = nonce
        initGoogleSignIn({
          clientId: googleClientId,
          hashedNonce,
          onCredential: (credential) => {
            if (!isCancelled) {
              handleGoogleCredential(credential)
            }
          },
        })

        renderGoogleButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 220,
        })
      } catch (error) {
        if (!isCancelled) {
          setAuthError(error instanceof Error ? error.message : 'Unable to initialize Google sign-in.')
        }
      }
    }

    setupGoogleSignIn()

    return () => {
      isCancelled = true
    }
  }, [googleClientId, handleGoogleCredential, session, supabase])

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
        googleButtonRef={googleButtonRef}
        googleConfigError={googleConfigError}
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
