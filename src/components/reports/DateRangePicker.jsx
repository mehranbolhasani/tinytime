import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const PRESET_RANGES = [
  { id: 'this_week', label: 'This week' },
  { id: 'last_week', label: 'Last week' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
]

export default function DateRangePicker({
  range,
  customFrom,
  customTo,
  onRangeChange,
  onApplyCustom,
}) {
  const [draftFrom, setDraftFrom] = useState(customFrom ?? '')
  const [draftTo, setDraftTo] = useState(customTo ?? '')

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESET_RANGES.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant={range === preset.id ? 'default' : 'secondary'}
            size="sm"
            className={cn(
              'h-auto rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150',
              range === preset.id ? 'bg-foreground text-background hover:bg-foreground/90' : 'text-muted-foreground hover:bg-border'
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
            'h-auto rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150',
            range === 'custom'
              ? 'bg-foreground text-background hover:bg-foreground/90'
              : 'text-muted-foreground hover:bg-border'
          )}
          onClick={() => onRangeChange('custom')}
        >
          Custom
        </Button>
      </div>

      {range === 'custom' ? (
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
              className="w-full rounded-lg border-border bg-secondary focus:bg-background focus:ring-1 focus:ring-ring/40 sm:w-[180px]"
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
              className="w-full rounded-lg border-border bg-secondary focus:bg-background focus:ring-1 focus:ring-ring/40 sm:w-[180px]"
            />
          </div>
          <Button
            type="button"
            onClick={() => onApplyCustom(draftFrom || null, draftTo || null)}
            disabled={!draftFrom || !draftTo}
            className="rounded-lg"
          >
            Apply
          </Button>
        </div>
      ) : null}
    </section>
  )
}
