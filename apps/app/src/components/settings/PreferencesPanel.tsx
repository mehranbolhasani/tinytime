import { useEffect, useRef, useState } from 'react'
import PreferencesContent from '@/components/settings/PreferencesContent'
import { isBlockingOverlayOpen } from '@/lib/keyboardShortcuts'
import { cn } from '@/lib/utils'
import type { useTimerNotification } from '@/hooks/useTimerNotification'

interface PreferencesPanelProps {
  open: boolean
  onClose: () => void
  userEmail: string
  onSignOut: () => void
  isSigningOut: boolean
  notification: ReturnType<typeof useTimerNotification>
}

/**
 * Desktop side panel that slides in from behind the main card. Hidden panels
 * stay mounted (inert) so Google Calendar does not re-query on every app load.
 */
export default function PreferencesPanel({
  open,
  onClose,
  userEmail,
  onSignOut,
  isSigningOut,
  notification,
}: PreferencesPanelProps) {
  const [hasOpened, setHasOpened] = useState(open)
  if (open && !hasOpened) setHasOpened(true)

  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!open) return

    const frame = requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }))

    const onKeyDown = (event: KeyboardEvent) => {
      // Radix (Select, Dialog) calls preventDefault when its own layer handles Escape;
      // an open overlay owns Escape until it closes.
      if (event.key !== 'Escape' || event.defaultPrevented || isBlockingOverlayOpen()) return
      onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  return (
    <div
      id="preferences-panel"
      role="region"
      aria-label="Preferences"
      inert={!open}
      className={cn(
        'absolute left-full top-0 h-full w-(--prefs-w) py-3 pr-3',
        'transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
        open ? 'translate-x-0 opacity-100 delay-75' : '-translate-x-4 opacity-0'
      )}
    >
      <div className="flex h-full flex-col gap-2 overflow-y-auto bg-transparent p-4">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-sm font-medium text-background outline-none"
        >
          Preferences
        </h2>

        {hasOpened ? (
          <PreferencesContent
            userEmail={userEmail}
            onSignOut={onSignOut}
            isSigningOut={isSigningOut}
            notification={notification}
          />
        ) : null}
      </div>
    </div>
  )
}
