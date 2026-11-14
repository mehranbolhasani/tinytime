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
    <div className="rounded-xl bg-indigo-900 p-1">
      <div className="grid grid-cols-3 gap-1">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            variant={preference === option ? 'secondarydark' : 'ghost'}
            size="sm"
            onClick={() => onChange(option)}
            className="h-auto px-2 py-2 text-xs capitalize text-background hover:bg-indigo-700!"
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  )
}
