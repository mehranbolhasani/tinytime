import { useRef } from 'react'
import PreferencesContent from '@/components/settings/PreferencesContent'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useSwipeToClose } from '@/hooks/useSwipeToClose'
import type { useTimerNotification } from '@/hooks/useTimerNotification'

interface PreferencesSheetProps {
  open: boolean
  onClose: () => void
  userEmail: string
  onSignOut: () => void
  isSigningOut: boolean
  notification: ReturnType<typeof useTimerNotification>
}

/** Mobile preferences: a dark sheet that slides up from the tab bar. */
export default function PreferencesSheet({
  open,
  onClose,
  userEmail,
  onSignOut,
  isSigningOut,
  notification,
}: PreferencesSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const swipeHandlers = useSwipeToClose(sheetRef, onClose)

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <SheetContent
        ref={sheetRef}
        side="bottom"
        aria-describedby={undefined}
        className="max-h-[85dvh] gap-0 overflow-hidden rounded-t-2xl border-0 bg-foreground p-0 pb-[env(safe-area-inset-bottom)] data-[swiped=true]:animate-none [&>button]:text-background/70"
      >
        <div {...swipeHandlers} className="touch-none select-none px-4 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-background/30" aria-hidden="true" />
          <SheetTitle className="text-sm font-medium text-background">Preferences</SheetTitle>
        </div>
        <div className="max-h-[calc(85dvh-4rem)] overflow-y-auto overscroll-contain px-4 pb-4">
          <PreferencesContent
            userEmail={userEmail}
            onSignOut={onSignOut}
            isSigningOut={isSigningOut}
            notification={notification}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
