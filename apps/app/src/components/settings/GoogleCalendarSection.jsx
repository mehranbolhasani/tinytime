import { Button } from '@/components/ui/button'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { cn } from '@/lib/utils'

export default function GoogleCalendarSection() {
  const {
    connection,
    calendars,
    selectedCalendarIds,
    isLoadingConnection,
    isLoadingCalendars,
    connect,
    disconnect,
    isConnecting,
    isDisconnecting,
    toggleCalendar,
  } = useGoogleCalendar()

  const showCalendars = connection.connected && !connection.needsReconnect

  return (
    <section className="space-y-2 rounded-lg border border-border p-2">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Google Calendar</p>
        <p className="text-xs text-muted-foreground">
          {connection.connected
            ? connection.email ?? 'Connected'
            : 'Connect to show your events on the Calendar page.'}
        </p>
      </div>

      {connection.needsReconnect ? (
        <p className="rounded-md border border-amber-300/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">
          Your Google authorization expired. Reconnect to load events.
        </p>
      ) : null}

      {connection.connected ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => disconnect()}
          disabled={isDisconnecting || isLoadingConnection}
          className="h-8 w-full rounded-md border-border bg-secondary text-sm"
        >
          {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={() => connect()}
          disabled={isConnecting || isLoadingConnection}
          className="h-8 w-full rounded-md text-sm"
        >
          {isConnecting ? 'Connecting...' : 'Connect Google Calendar'}
        </Button>
      )}

      {showCalendars ? (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-medium text-muted-foreground">Calendars shown in day view</p>
          {isLoadingCalendars ? (
            <p className="text-xs text-muted-foreground">Loading calendars...</p>
          ) : calendars.length === 0 ? (
            <p className="text-xs text-muted-foreground">No calendars found in this Google account.</p>
          ) : (
            <div className="space-y-1">
              {calendars.map((calendar) => {
                const isSelected = selectedCalendarIds.includes(calendar.id)
                return (
                  <button
                    key={calendar.id}
                    type="button"
                    onClick={() => toggleCalendar(calendar)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
                      isSelected
                        ? 'border-primary/40 bg-primary/10 text-foreground'
                        : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: calendar.backgroundColor }} />
                      <span className="truncate">{calendar.summary}</span>
                    </span>
                    <span>{isSelected ? 'On' : 'Off'}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}
