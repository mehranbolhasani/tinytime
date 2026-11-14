import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '@/components/layout/navItems'
import { preloadRoute } from '@/components/layout/routePreload'
import SettingsPopover from '@/components/settings/SettingsPopover'
import type { useTimerNotification } from '@/hooks/useTimerNotification'

interface SideNavProps {
  userEmail: string
  onSignOut: () => void
  isSigningOut: boolean
  notification: ReturnType<typeof useTimerNotification>
}

export default function SideNav({
  userEmail,
  onSignOut,
  isSigningOut,
  notification,
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
    <header className="h-full bg-foreground z-1 flex flex-col gap-4 w-20 items-center justify-between px-0 py-6 rounded-lg">
      <div className="inline-flex items-center gap-0 w-10 h-10 justify-center bg-primary/80 rounded-lg aspect-square">
        <span className="relative h-1.5 w-6 rounded-sm bg-background" />
      </div>

      <nav className="">
        <ul className="flex flex-col items-center justify-between gap-0 sm:gap-1">
          {navLinks}
        </ul>
      </nav>

      <SettingsPopover
        userEmail={userEmail}
        onSignOut={onSignOut}
        isSigningOut={isSigningOut}
        notification={notification}
      />
    </header>
  )
}
