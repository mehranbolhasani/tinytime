import { useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import AuthView from '@/components/auth/AuthView'
import ConfigErrorView from '@/components/auth/ConfigErrorView'
import AppLayout from '@/components/layout/AppLayout'
import AppShellSkeleton from '@/components/layout/AppShellSkeleton'
import { SessionUserProvider } from '@/contexts/SessionContext'
import { TimerProvider } from '@/contexts/TimerContext'
import { useAuth } from '@/hooks/useAuth'
import { assertSupabaseClient, supabaseConfigError } from '@/lib/supabase'

export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
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
          gcTime: 30 * 60_000,
          refetchOnWindowFocus: !isMobileViewport,
        },
      },
    })
  }, [])
  const auth = useAuth({ supabase, queryClient, googleClientId })

  if (supabaseConfigError) {
    return <ConfigErrorView />
  }

  if (auth.isAuthLoading) {
    return <AppShellSkeleton />
  }

  if (!auth.session) {
    return (
      <AuthView
        email={auth.email}
        onEmailChange={auth.setEmail}
        onSubmit={auth.handleSendMagicLink}
        onSignInWithGithub={auth.handleSignInWithGithub}
        isSubmitting={auth.isSendingLink}
        isGithubSubmitting={auth.isSendingGithub}
        googleButtonRef={auth.googleButtonRef}
        googleConfigError={googleConfigError}
        googleButtonError={auth.googleButtonError}
        notice={auth.authNotice}
        error={auth.authError}
      />
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SessionUserProvider userId={auth.session.user.id}>
        <TimerProvider>
          <BrowserRouter>
            <AppLayout
              userEmail={auth.session.user?.email ?? 'signed-in user'}
              onSignOut={auth.handleSignOut}
              isSigningOut={auth.isSigningOut}
            />
          </BrowserRouter>
        </TimerProvider>
      </SessionUserProvider>
    </QueryClientProvider>
  )
}
