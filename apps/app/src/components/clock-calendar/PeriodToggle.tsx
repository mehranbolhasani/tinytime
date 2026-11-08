import { Button } from '@/components/ui/button'
import type { ClockPeriod } from '@/lib/clockCalendar'
import { cn } from '@/lib/utils'

interface PeriodToggleProps {
  period: ClockPeriod
  onChange: (period: ClockPeriod) => void
  className?: string
}

export default function PeriodToggle({ period, onChange, className }: PeriodToggleProps) {
  return (
    <div
      className={cn('inline-flex items-center gap-1 rounded-full bg-secondary p-0.5', className)}
      role="group"
      aria-label="AM or PM period"
    >
      <Button
        type="button"
        size="sm"
        variant={period === 0 ? 'default' : 'ghost'}
        className="h-7 rounded-full px-3 text-xs"
        aria-pressed={period === 0}
        onClick={() => onChange(0)}
      >
        AM
      </Button>
      <Button
        type="button"
        size="sm"
        variant={period === 1 ? 'default' : 'ghost'}
        className="h-7 rounded-full px-3 text-xs"
        aria-pressed={period === 1}
        onClick={() => onChange(1)}
      >
        PM
      </Button>
    </div>
  )
}
