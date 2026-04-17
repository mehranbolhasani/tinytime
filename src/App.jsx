import { useEffect, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { Clock, CalendarDays, BarChart2, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { assertSupabaseClient, getFriendlySupabaseError, supabaseConfigError } from '@/lib/supabase'
import Calendar from './pages/Calendar'
import Projects from './pages/Projects'
import Reports from './pages/Reports'
import Today from './pages/Today'

const queryClient = new QueryClient()

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
    <main className="flex max-w-xl mx-auto min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
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
            className="rounded-lg border-border bg-secondary focus:bg-white"
          />
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary text-white hover:bg-primary/90"
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

        {notice ? <p className="mt-3 text-sm text-emerald-600">{notice}</p> : null}
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </section>
    </main>
  )
}

function AppLayout({ userEmail, onSignOut, isSigningOut }) {
  return (
    <div className="flex min-h-screen gap-8 px-8">
      <div className="relative w-[250px]">
        <aside className="relative h-fit z-40 flex flex-col bg-card top-8 rounded-xl">
          <div className="flex items-center gap-1 px-4 py-4">
            <span className="h-1.5 w-6 rounded-md bg-primary relative" />
            <span className="text-base font-normal text-foreground">tiny<span className="text-primary font-bold">time</span></span>
          </div>
  
          <nav className="px-4 py-4">
            <ul className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-100 ${
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
              ))}
            </ul>
          </nav>
  
          <div className="space-y-2 border-t border-border px-4 py-4">
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
        <div className="">
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/projects" element={<Projects />} />
          </Routes>
        </div>
      </main>
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
      <BrowserRouter>
        <AppLayout
          userEmail={session.user?.email ?? 'signed-in user'}
          onSignOut={handleSignOut}
          isSigningOut={isSigningOut}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
