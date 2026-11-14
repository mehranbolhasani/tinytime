import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import CommandPalette from '@/components/CommandPalette'
import AppRoutes from '@/components/layout/AppRoutes'
import { preloadAllRoutesWhenIdle } from '@/components/layout/routePreload'
import SideNav from '@/components/layout/SideNav'
import IdleDetectionDialog from '@/components/IdleDetectionDialog'
import MiniTimerPill from '@/components/timer/MiniTimerPill'
import Toaster from '@/components/ui/sonner'
import { useTimerContext } from '@/contexts/TimerContext'
import { useAppKeyboardShortcuts } from '@/hooks/useAppKeyboardShortcuts'
import { useIdleDetection } from '@/hooks/useIdleDetection'
import { useTimerControlActions } from '@/hooks/useTimerControlActions'
import { useTimerNotification } from '@/hooks/useTimerNotification'
import { timeEntriesListQueryOptions } from '@/hooks/useTimeEntries'
import { buildReportRange } from '@/lib/reports'
import { scrollToTop } from '@/lib/scroll'
import { assertSupabaseClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  userEmail: string
  onSignOut: () => void
  isSigningOut: boolean
}

export default function AppLayout({ userEmail, onSignOut, isSigningOut }: AppLayoutProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isRunning } = useTimerContext()
  const notification = useTimerNotification()
  const { toggleTimer, stopTimer } = useTimerControlActions({ reportErrors: 'toast' })
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [isPrefsOpen, setIsPrefsOpen] = useState(false)
  const [prevPathname, setPrevPathname] = useState(pathname)
  const contentRef = useRef<HTMLDivElement>(null)
  const prefsButtonRef = useRef<HTMLButtonElement>(null)

  const closePrefs = useCallback(() => setIsPrefsOpen(false), [])
  const togglePrefs = useCallback(() => setIsPrefsOpen((open) => !open), [])

  // Navigating always closes the panel, including nav-link clicks.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    if (isPrefsOpen) setIsPrefsOpen(false)
  }

  const wasPrefsOpenRef = useRef(isPrefsOpen)

  // Hand focus back to the cog when the panel closes, unless focus moved elsewhere
  // (e.g. into a dialog opened from the panel).
  useEffect(() => {
    if (wasPrefsOpenRef.current && !isPrefsOpen) {
      const active = document.activeElement
      const panel = document.getElementById('preferences-panel')
      const focusWasInsidePanel = Boolean(panel && active && panel.contains(active))
      const focusWasLost = !active || active === document.body

      if (focusWasInsidePanel || focusWasLost) {
        prefsButtonRef.current?.focus({ preventScroll: true })
      }
    }

    wasPrefsOpenRef.current = isPrefsOpen
  }, [isPrefsOpen])

  const warmReports = useCallback(() => {
    const range = buildReportRange('this_week', null, null)
    if (range.from && range.to) {
      void queryClient.prefetchQuery(
        timeEntriesListQueryOptions(assertSupabaseClient(), { from: range.from, to: range.to })
      )
    }
  }, [queryClient])

  useEffect(() => preloadAllRoutesWhenIdle(warmReports), [warmReports])

  const [idleState, setIdleState] = useState<{
    idleSeconds: number
    hiddenAt: Date
  } | null>(null)

  useIdleDetection({
    isRunning,
    onIdleReturn: (idleSeconds, hiddenAt) => {
      setIdleState({ idleSeconds, hiddenAt })
    },
  })

  const handleKeepTime = () => setIdleState(null)

  const handleDiscardIdleTime = async () => {
    if (!idleState) return
    await stopTimer({ stoppedAt: idleState.hiddenAt.toISOString() })
    setIdleState(null)
  }

  useAppKeyboardShortcuts({
    pathname,
    navigate,
    onToggleTimer: toggleTimer,
    onOpenPalette: () => setIsPaletteOpen(true),
    onTogglePreferences: togglePrefs,
  })

  const handleMiniTimerClick = () => {
    if (pathname !== '/') {
      navigate('/')
    }

    scrollToTop(contentRef.current)
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const element = contentRef.current
    if ((element && element.scrollTop > 0) || window.scrollY > 0) {
      scrollToTop(element, 'auto')
    }
  }, [pathname])

  return (
    <div className="relative mx-auto flex h-screen max-h-screen w-full justify-center items-stretch gap-0 bg-foreground p-0 overflow-hidden [--prefs-w:min(20rem,calc(100vw-5rem))]">
      <SideNav
        userEmail={userEmail}
        onSignOut={onSignOut}
        isSigningOut={isSigningOut}
        notification={notification}
        isPrefsOpen={isPrefsOpen}
        onTogglePrefs={togglePrefs}
        onClosePrefs={closePrefs}
        prefsButtonRef={prefsButtonRef}
      />

      <main
        className={cn(
          'relative z-10 mx-auto w-full max-w-full max-h-screen flex-1 overflow-hidden rounded-l-2xl bg-background',
          'transition-[translate] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
          isPrefsOpen && 'translate-x-(--prefs-w)'
        )}
      >
        <div ref={contentRef} className="h-full overflow-y-auto" inert={isPrefsOpen}>
          <AppRoutes />
        </div>
        {isPrefsOpen ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close preferences"
            className="absolute inset-0 z-50 cursor-default"
            onClick={closePrefs}
          />
        ) : null}
      </main>

      {isRunning ? (
        <div className="fixed left-1/2 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 -translate-x-1/2">
          <MiniTimerPill onClick={handleMiniTimerClick} />
        </div>
      ) : null}


      <IdleDetectionDialog
        open={Boolean(idleState)}
        idleSeconds={idleState?.idleSeconds ?? 0}
        hiddenAt={idleState?.hiddenAt ?? new Date()}
        onKeep={handleKeepTime}
        onDiscard={handleDiscardIdleTime}
      />

      <CommandPalette
        open={isPaletteOpen}
        onOpenChange={setIsPaletteOpen}
        onNavigate={(to) => { navigate(to); setIsPaletteOpen(false) }}
        onToggleTimer={async () => { await toggleTimer(); setIsPaletteOpen(false) }}
      />

      <Toaster />
    </div>
  )
}
