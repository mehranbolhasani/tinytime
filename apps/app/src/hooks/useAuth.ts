import { useCallback, useEffect, useRef, useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { generateNonce, initGoogleSignIn, loadGisScript, renderGoogleButton } from '@/lib/googleSignIn'
import { getFriendlySupabaseError } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

interface UseAuthOptions {
  supabase: SupabaseClient<Database> | null
  queryClient: QueryClient
  googleClientId: string | undefined
}

export function useAuth({ supabase, queryClient, googleClientId }: UseAuthOptions) {
  const [session, setSession] = useState<Session | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(supabase !== null)
  const [email, setEmail] = useState('')
  const [isSendingLink, setIsSendingLink] = useState(false)
  const [isSendingGithub, setIsSendingGithub] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [authNotice, setAuthNotice] = useState('')
  const [authError, setAuthError] = useState('')
  const [googleButtonError, setGoogleButtonError] = useState('')
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const googleNonceRef = useRef('')
  const lastUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    let isCurrent = true

    const syncUser = (nextSession: Session | null) => {
      const nextUserId = nextSession?.user?.id ?? null
      if (lastUserIdRef.current !== nextUserId) {
        if (lastUserIdRef.current !== null) {
          queryClient.clear()
        }
        lastUserIdRef.current = nextUserId
      }
    }

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!isCurrent) {
        return
      }

      if (error) {
        setAuthError(getFriendlySupabaseError(error, 'Unable to check your auth session.'))
        syncUser(null)
        setSession(null)
      } else {
        syncUser(data.session ?? null)
        setSession(data.session ?? null)
      }

      setIsAuthLoading(false)
    }

    loadSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncUser(nextSession ?? null)
      setSession(nextSession ?? null)
      setIsAuthLoading(false)
    })

    return () => {
      isCurrent = false
      authListener.subscription.unsubscribe()
    }
  }, [queryClient, supabase])

  const handleSendMagicLink = async (event: React.FormEvent) => {
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

  const handleGoogleCredential = useCallback(async (credential: string) => {
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
    if (isAuthLoading || session || !supabase || !googleClientId || !googleButtonRef.current) {
      return undefined
    }

    let isCancelled = false

    const setupGoogleSignIn = async () => {
      try {
        setGoogleButtonError('')
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

        renderGoogleButton(googleButtonRef.current!, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 220,
        })
      } catch (error) {
        if (!isCancelled) {
          setGoogleButtonError('Google sign-in button failed to load. Refresh the page and try again.')
          setAuthError(error instanceof Error ? error.message : 'Unable to initialize Google sign-in.')
        }
      }
    }

    setupGoogleSignIn()

    return () => {
      isCancelled = true
    }
  }, [googleClientId, handleGoogleCredential, isAuthLoading, session, supabase])

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

  return {
    session,
    isAuthLoading,
    email,
    setEmail,
    isSendingLink,
    isSendingGithub,
    isSigningOut,
    authNotice,
    authError,
    googleButtonError,
    googleButtonRef,
    handleSendMagicLink,
    handleSignOut,
    handleSignInWithGithub,
  }
}
