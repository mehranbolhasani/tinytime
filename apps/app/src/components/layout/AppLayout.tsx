import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CommandPalette from '@/components/CommandPalette'
import AppRoutes from '@/components/layout/AppRoutes'
import SideNav from '@/components/layout/SideNav'
import IdleDetectionDialog from '@/components/IdleDetectionDialog'
import MiniTimerPill from '@/components/timer/MiniTimerPill'
import Toaster from '@/components/ui/sonner'
import { useTimerContext } from '@/contexts/TimerContext'
import { useAppKeyboardShortcuts } from '@/hooks/useAppKeyboardShortcuts'
import { useIdleDetection } from '@/hooks/useIdleDetection'
import { useTimerControlActions } from '@/hooks/useTimerControlActions'
import { useTimerNotification } from '@/hooks/useTimerNotification'
import { scrollToTop } from '@/lib/scroll'

interface AppLayoutProps {
  userEmail: string
  onSignOut: () => void
  isSigningOut: boolean
}

export default function AppLayout({ userEmail, onSignOut, isSigningOut }: AppLayoutProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isRunning } = useTimerContext()
  const notification = useTimerNotification()
  const { toggleTimer, stopTimer } = useTimerControlActions({ reportErrors: 'toast' })
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

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
    <div className="mx-auto flex h-screen max-h-screen w-full justify-center items-stretch gap-0 bg-foreground p-0 overflow-hidden">
      <SideNav
        userEmail={userEmail}
        onSignOut={onSignOut}
        isSigningOut={isSigningOut}
        notification={notification}
      />

      <main className="mx-auto w-full max-w-full max-h-screen flex-1 bg-background rounded-l-2xl overflow-hidden">
        <div ref={contentRef} className="overflow-y-auto h-full">
          <AppRoutes />
        </div>
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
