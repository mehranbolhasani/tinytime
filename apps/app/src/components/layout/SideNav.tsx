import { Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '@/components/layout/navItems'
import { preloadRoute } from '@/components/layout/routePreload'
import PreferencesPanel from '@/components/settings/PreferencesPanel'
import PreferencesSheet from '@/components/settings/PreferencesSheet'
import { Button } from '@/components/ui/button'
import { useTimerContext } from '@/contexts/TimerContext'
import { useElapsedSeconds } from '@/hooks/useElapsedSeconds'
import { cn, formatDurationHMS } from '@/lib/utils'
import type { useTimerNotification } from '@/hooks/useTimerNotification'

interface SideNavProps {
  userEmail: string
  onSignOut: () => void
  isSigningOut: boolean
  notification: ReturnType<typeof useTimerNotification>
  isDesktop: boolean
  isPrefsOpen: boolean
  onTogglePrefs: () => void
  onClosePrefs: () => void
  prefsButtonRef: React.RefObject<HTMLButtonElement | null>
}

/** Live elapsed time for the Today tab. Isolated so the rest of the nav stays still. */
function TodayTabLabel({ className }: { className?: string }) {
  const { activeEntry } = useTimerContext()
  const elapsed = useElapsedSeconds(activeEntry?.started_at)

  return (
    <span className={cn('tabular-nums', className)} aria-hidden="true">
      {formatDurationHMS(elapsed)}
    </span>
  )
}

export default function SideNav({
  userEmail,
  onSignOut,
  isSigningOut,
  notification,
  isDesktop,
  isPrefsOpen,
  onTogglePrefs,
  onClosePrefs,
  prefsButtonRef,
}: SideNavProps) {
  const { isRunning } = useTimerContext()

  const navLinks = NAV_ITEMS.map((item) => (
    <li key={item.to} className="shrink-0">
      <NavLink
        to={item.to}
        end={item.to === '/'}
        onPointerEnter={() => preloadRoute(item.to)}
        onFocus={() => preloadRoute(item.to)}
        onPointerDown={() => preloadRoute(item.to)}
        className={({ isActive }) =>
          cn(
            'relative flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-normal transition-colors duration-100 md:h-10 md:w-10 md:rounded-lg md:text-sm',
            isActive ? 'text-background' : 'text-background/60 hover:text-background'
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive ? (
              <>
                <span className="absolute top-1 h-12 w-12 rounded-full bg-primary md:hidden" />
                <span className="absolute inset-0 hidden rounded-md bg-primary md:block" />
              </>
            ) : null}
            <item.icon className="relative z-10 h-5 w-5" />
            {item.to === '/' && isRunning ? (
              <>
                <span className="sr-only">Today</span>
                <TodayTabLabel className="relative z-10 md:hidden" />
              </>
            ) : (
              <span className="relative z-10 sr-only">{item.label}</span>
            )}
          </>
        )}
      </NavLink>
    </li>
  ))

  return (
    <header className="relative z-1 order-last flex w-full shrink-0 items-stretch bg-foreground px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:order-first md:h-full md:w-20 md:flex-col md:items-center md:justify-between md:gap-4 md:rounded-lg md:px-0 md:py-6">
      <div className="hidden md:inline-flex items-center gap-0 w-10 h-10 justify-center bg-primary/80 rounded-lg aspect-square">
        <span className="relative h-1.5 w-6 rounded-sm bg-background" />
      </div>

      <nav className="flex-1 md:flex-none">
        <ul className="grid grid-cols-4 md:flex md:flex-col md:items-center md:gap-1">
          {navLinks}
        </ul>
      </nav>

      <div className="grid w-1/5 place-items-center md:w-auto">
        <Button
          ref={prefsButtonRef}
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Preferences"
          aria-expanded={isPrefsOpen}
          aria-controls={isDesktop ? 'preferences-panel' : undefined}
          aria-keyshortcuts="Meta+Comma Control+Comma"
          onClick={onTogglePrefs}
          className={cn(
            'relative flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-none text-[10px] text-background/60 hover:bg-transparent! hover:text-background md:h-10 md:w-10 md:rounded-lg md:text-sm [&_svg]:size-5',
            isPrefsOpen && 'text-background md:bg-primary md:hover:bg-primary'
          )}
        >
          {isPrefsOpen ? (
            <span className="absolute top-1.5 h-8 w-12 rounded-full bg-primary md:hidden" />
          ) : null}
          <Settings
            className={cn(
              'relative z-10 h-5 w-5 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
              isPrefsOpen && 'rotate-90'
            )}
            aria-hidden="true"
          />
          <span className="relative z-10 sr-only">Settings</span>
        </Button>
      </div>

      {isDesktop ? (
        <PreferencesPanel
          open={isPrefsOpen}
          onClose={onClosePrefs}
          userEmail={userEmail}
          onSignOut={onSignOut}
          isSigningOut={isSigningOut}
          notification={notification}
        />
      ) : (
        <PreferencesSheet
          open={isPrefsOpen}
          onClose={onClosePrefs}
          userEmail={userEmail}
          onSignOut={onSignOut}
          isSigningOut={isSigningOut}
          notification={notification}
        />
      )}
    </header>
  )
}
