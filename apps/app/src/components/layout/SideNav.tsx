import { Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '@/components/layout/navItems'
import { preloadRoute } from '@/components/layout/routePreload'
import PreferencesPanel from '@/components/settings/PreferencesPanel'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { useTimerNotification } from '@/hooks/useTimerNotification'

interface SideNavProps {
  userEmail: string
  onSignOut: () => void
  isSigningOut: boolean
  notification: ReturnType<typeof useTimerNotification>
  isPrefsOpen: boolean
  onTogglePrefs: () => void
  onClosePrefs: () => void
  prefsButtonRef: React.RefObject<HTMLButtonElement | null>
}

export default function SideNav({
  userEmail,
  onSignOut,
  isSigningOut,
  notification,
  isPrefsOpen,
  onTogglePrefs,
  onClosePrefs,
  prefsButtonRef,
}: SideNavProps) {
  const navLinks = NAV_ITEMS.map((item) => (
    <li key={item.to} className="shrink-0">
      <NavLink
        to={item.to}
        end={item.to === '/'}
        onPointerEnter={() => preloadRoute(item.to)}
        onFocus={() => preloadRoute(item.to)}
        onPointerDown={() => preloadRoute(item.to)}
        className={({ isActive }) =>
          `relative inline-flex items-center rounded-lg w-10 h-10 justify-center text-sm font-normal transition-colors duration-100 ${
            isActive
              ? 'text-background'
              : 'text-background/60 hover:text-background'
          }`
        }
      >
        {({ isActive }) => (
          <>
            {isActive ? (
              <span className="absolute inset-0 rounded-md bg-primary/100" />
            ) : null}
            <item.icon className="relative z-10 h-5 w-5" />
          </>
        )}
      </NavLink>
    </li>
  ))

  return (
    <header className="relative h-full bg-foreground z-1 flex flex-col gap-4 w-20 items-center justify-between px-0 py-6 rounded-lg">
      <div className="inline-flex items-center gap-0 w-10 h-10 justify-center bg-primary/80 rounded-lg aspect-square">
        <span className="relative h-1.5 w-6 rounded-sm bg-background" />
      </div>

      <nav className="">
        <ul className="flex flex-col items-center justify-between gap-0 sm:gap-1">
          {navLinks}
        </ul>
      </nav>

      <Button
        ref={prefsButtonRef}
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Preferences"
        aria-expanded={isPrefsOpen}
        aria-controls="preferences-panel"
        aria-keyshortcuts="Meta+Comma Control+Comma"
        onClick={onTogglePrefs}
        className={cn(
          'h-10 w-10 rounded-lg text-background/60 hover:bg-transparent! hover:text-background [&_svg]:size-5',
          isPrefsOpen && 'bg-primary text-background hover:bg-primary'
        )}
      >
        <Settings
          className={cn(
            'h-5 w-5 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
            isPrefsOpen && 'rotate-90'
          )}
          aria-hidden="true"
        />
      </Button>

      <PreferencesPanel
        open={isPrefsOpen}
        onClose={onClosePrefs}
        userEmail={userEmail}
        onSignOut={onSignOut}
        isSigningOut={isSigningOut}
        notification={notification}
      />
    </header>
  )
}
