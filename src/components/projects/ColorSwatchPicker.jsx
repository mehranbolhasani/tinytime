import { COLOR_PRESETS, toSafeHexColor } from '@/lib/color'
import { cn } from '@/lib/utils'

export default function ColorSwatchPicker({ value, onChange, colors = COLOR_PRESETS }) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => {
        const isSelected = value === color
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              'h-10 w-10 rounded-full border border-border cursor-pointer transition-transform duration-100 sm:h-7 sm:w-7',
              isSelected && 'ring-2 ring-offset-2 ring-foreground'
            )}
            style={{ backgroundColor: toSafeHexColor(color) }}
            aria-label={`Select ${color} color`}
          />
        )
      })}
    </div>
  )
}
