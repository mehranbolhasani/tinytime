import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { CalendarDays } from 'lucide-react'

export type RangePreset = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom'

const PRESET_RANGES: { id: RangePreset; label: string }[] = [
  { id: 'this_week', label: 'This week' },
  { id: 'last_week', label: 'Last week' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
]

interface DateRangePickerProps {
  range: RangePreset
  customFrom: string | null
  customTo: string | null
  onRangeChange: (range: RangePreset) => void
  onApplyCustom: (from: string | null, to: string | null) => void
  actions?: ReactNode
}

export default function DateRangePicker({
  range,
  customFrom,
  customTo,
  onRangeChange,
  onApplyCustom,
  actions,
}: DateRangePickerProps) {
  const [draftFrom, setDraftFrom] = useState(customFrom ?? '')
  const [draftTo, setDraftTo] = useState(customTo ?? '')
  const isInvalidRange = Boolean(draftFrom && draftTo && draftFrom > draftTo)

  return (
    <section className="space-y-3 rounded-xl bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {PRESET_RANGES.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant={range === preset.id ? 'default' : 'secondary'}
              size="sm"
              className={cn(
                'font-normal',
                range === preset.id ? null : 'text-muted-foreground'
              )}
              onClick={() => onRangeChange(preset.id)}
            >
              {preset.label}
            </Button>
          ))}
          <Button
            type="button"
            variant={range === 'custom' ? 'default' : 'secondary'}
            size="sm"
            className={cn(
              'px-3 font-normal',
              range === 'custom' ? null : 'text-muted-foreground'
            )}
            onClick={() => onRangeChange('custom')}
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
        </div>

        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>

      {range === 'custom' ? (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full space-y-1 sm:w-auto">
              <label htmlFor="custom-from" className="text-xs font-medium text-muted-foreground/70">
                From
              </label>
              <Input
                id="custom-from"
                type="date"
                value={draftFrom}
                onChange={(event) => setDraftFrom(event.target.value)}
                className="sm:w-[180px]"
                size="sm"
              />
            </div>
            <div className="w-full space-y-1 sm:w-auto">
              <label htmlFor="custom-to" className="text-xs font-medium text-muted-foreground/70">
                To
              </label>
              <Input
                id="custom-to"
                type="date"
                value={draftTo}
                onChange={(event) => setDraftTo(event.target.value)}
                className="sm:w-[180px]"
                size="sm"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => onApplyCustom(draftFrom || null, draftTo || null)}
              disabled={!draftFrom || !draftTo || isInvalidRange}
            >
              Apply
            </Button>
          </div>
          {isInvalidRange ? (
            <p role="alert" className="text-xs text-destructive">
              "To" must be on or after "From".
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
