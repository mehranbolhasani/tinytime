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
          <button
            key={preset.id}
            type="button"
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150',
              range === preset.id
                ? 'bg-foreground text-white'
                : 'bg-secondary text-muted-foreground hover:bg-border'
            )}
            onClick={() => onRangeChange(preset.id)}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150',
            range === 'custom'
              ? 'bg-foreground text-white'
              : 'bg-secondary text-muted-foreground hover:bg-border'
          )}
          onClick={() => onRangeChange('custom')}
        >
          Custom
        </button>
      </div>

      {range === 'custom' ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="custom-from" className="text-xs font-medium text-muted-foreground/70">
              From
            </label>
            <Input
              id="custom-from"
              type="date"
              value={draftFrom}
              onChange={(event) => setDraftFrom(event.target.value)}
              className="w-[180px] rounded-lg border-border bg-secondary focus:bg-white focus:ring-1 focus:ring-ring/40"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="custom-to" className="text-xs font-medium text-muted-foreground/70">
              To
            </label>
            <Input
              id="custom-to"
              type="date"
              value={draftTo}
              onChange={(event) => setDraftTo(event.target.value)}
              className="w-[180px] rounded-lg border-border bg-secondary focus:bg-white focus:ring-1 focus:ring-ring/40"
            />
          </div>
          <Button
            type="button"
            onClick={() => onApplyCustom(draftFrom || null, draftTo || null)}
            disabled={!draftFrom || !draftTo}
            className="rounded-lg bg-primary text-white hover:bg-primary/90"
          >
            Apply
          </Button>
        </div>
      ) : null}
    </section>
  )
}
