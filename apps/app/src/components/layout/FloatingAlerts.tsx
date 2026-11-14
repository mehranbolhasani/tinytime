import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AlertTone = 'destructive' | 'warning' | 'success'

const TONES: Record<AlertTone, { frame: string; tint: string }> = {
  destructive: {
    frame: 'border-destructive/30 text-destructive',
    tint: 'bg-destructive/5',
  },
  warning: {
    frame: 'border-amber-300/30 text-amber-700 dark:text-amber-300',
    tint: 'bg-amber-500/10',
  },
  success: {
    frame: 'border-emerald-300/30 text-emerald-700 dark:text-emerald-300',
    tint: 'bg-emerald-500/10',
  },
}

/**
 * Transient messages that float over the content instead of taking height from
 * it, so showing one never moves the layout underneath.
 */
export default function FloatingAlerts({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-3 top-3 z-30 flex flex-col gap-2 empty:hidden [&>*]:pointer-events-auto [&>*]:shadow-sm',
        className
      )}
    >
      {children}
    </div>
  )
}

interface FloatingAlertProps {
  children: ReactNode
  tone?: AlertTone
  role?: 'alert' | 'status'
  className?: string
  /** Shows a dismiss button. */
  onDismiss?: () => void
  /** When set together with `onDismiss`, dismisses automatically after this delay. */
  autoDismissMs?: number
}

/** An opaque alert card: the tone tint is drawn over a solid `bg-card`. */
export function FloatingAlert({
  children,
  tone = 'destructive',
  role = 'alert',
  className,
  onDismiss,
  autoDismissMs,
}: FloatingAlertProps) {
  const { frame, tint } = TONES[tone]

  useEffect(() => {
    if (!onDismiss || autoDismissMs === undefined) {
      return
    }

    const id = window.setTimeout(onDismiss, autoDismissMs)
    return () => window.clearTimeout(id)
    // `children` is in the deps so a new message restarts the countdown.
  }, [autoDismissMs, children, onDismiss])

  return (
    <div
      role={role}
      className={cn(
        'relative isolate overflow-hidden rounded-lg border bg-card p-3 text-sm',
        frame,
        className
      )}
    >
      <span aria-hidden="true" className={cn('pointer-events-none absolute inset-0 -z-10', tint)} />
      {onDismiss ? (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">{children}</div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Dismiss"
            className="h-5 w-5 shrink-0"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        children
      )}
    </div>
  )
}
