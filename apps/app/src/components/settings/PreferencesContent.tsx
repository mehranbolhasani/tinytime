import GoogleCalendarSection from '@/components/settings/GoogleCalendarSection'
import NotificationSetting from '@/components/settings/NotificationSetting'
import ShortcutsList from '@/components/settings/ShortcutsList'
import ThemePreferenceToggle from '@/components/settings/ThemePreferenceToggle'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import type { useTimerNotification } from '@/hooks/useTimerNotification'

interface PreferencesContentProps {
  userEmail: string
  onSignOut: () => void
  isSigningOut: boolean
  notification: ReturnType<typeof useTimerNotification>
}

/** The settings sections, without a heading: used by the desktop panel and the mobile sheet. */
export default function PreferencesContent({
  userEmail,
  onSignOut,
  isSigningOut,
  notification,
}: PreferencesContentProps) {
  const { preference, setThemePreference, options } = useTheme()

  return (
    <>
      <div className="space-y-2 py-5">
        <p className="text-xs font-medium uppercase tracking-wide text-background">Theme</p>
        <ThemePreferenceToggle
          preference={preference}
          options={options}
          onChange={setThemePreference}
        />
      </div>

      <GoogleCalendarSection />
      <NotificationSetting notification={notification} />
      <ShortcutsList />

      <div className="mt-auto space-y-2">
        <p className="truncate text-xs text-background/70">{userEmail}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSignOut}
          disabled={isSigningOut}
          className="w-full bg-indigo-900 text-background"
        >
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </Button>
      </div>
    </>
  )
}
