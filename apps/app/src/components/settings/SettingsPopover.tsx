import { Menu } from 'lucide-react'
import GoogleCalendarSection from '@/components/settings/GoogleCalendarSection'
import NotificationSetting from '@/components/settings/NotificationSetting'
import ShortcutsList from '@/components/settings/ShortcutsList'
import ThemePreferenceToggle from '@/components/settings/ThemePreferenceToggle'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useTheme } from '@/hooks/useTheme'
import type { useTimerNotification } from '@/hooks/useTimerNotification'

interface SettingsPopoverProps {
  userEmail: string
  onSignOut: () => void
  isSigningOut: boolean
  notification: ReturnType<typeof useTimerNotification>
}

export default function SettingsPopover({
  userEmail,
  onSignOut,
  isSigningOut,
  notification,
}: SettingsPopoverProps) {
  const { preference, setThemePreference, options } = useTheme()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Open account options"
          className="text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Menu className="h-8 w-8" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="z-50 w-[280px] space-y-3 rounded-lg border-border p-3 shadow-sm">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Preferences</p>
          <p className="text-xs text-muted-foreground">Theme and account actions.</p>
        </div>
        <div className="space-y-3">
          <ThemePreferenceToggle
            preference={preference}
            options={options}
            onChange={setThemePreference}
          />
          <GoogleCalendarSection />
          <NotificationSetting notification={notification} />
          <ShortcutsList />
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSignOut}
            disabled={isSigningOut}
            className="w-full bg-secondary"
          >
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
