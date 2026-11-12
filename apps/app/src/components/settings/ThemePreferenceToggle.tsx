import { Button } from '@/components/ui/button'
import type { ThemePreference } from '@/types'

interface ThemePreferenceToggleProps {
  preference: ThemePreference
  options: ThemePreference[]
  onChange: (option: ThemePreference) => void
}

export default function ThemePreferenceToggle({
  preference,
  options,
  onChange,
}: ThemePreferenceToggleProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-1">
      <div className="grid grid-cols-3 gap-1">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            variant={preference === option ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onChange(option)}
            className="h-auto px-2 py-2 text-xs capitalize"
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  )
}
