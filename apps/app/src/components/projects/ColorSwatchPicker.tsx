import { useState, useRef, useCallback, useEffect } from 'react'
import { Pipette } from 'lucide-react'
import { COLOR_PRESETS, hsvToHex, hexToHsv, isValidHex, toSafeHexColor, type HSV } from '@/lib/color'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ColorSwatchPickerProps {
  value: string
  onChange: (color: string) => void
  colors?: readonly string[]
}

function CustomColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value))
  const [hexInput, setHexInput] = useState(value)
  const satBriRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'satBri' | 'hue' | null>(null)

  useEffect(() => {
    const newHsv = hexToHsv(value)
    setHsv(newHsv)
    setHexInput(value)
  }, [value])

  const updateFromSatBri = useCallback((clientX: number, clientY: number) => {
    const rect = satBriRef.current?.getBoundingClientRect()
    if (!rect) return
    const s = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const v = Math.min(1, Math.max(0, 1 - (clientY - rect.top) / rect.height))
    const newHsv = { ...hsv, s, v }
    setHsv(newHsv)
    const hex = hsvToHex(newHsv)
    setHexInput(hex)
    onChange(hex)
  }, [hsv, onChange])

  const updateFromHue = useCallback((clientX: number) => {
    const rect = hueRef.current?.getBoundingClientRect()
    if (!rect) return
    const h = Math.min(360, Math.max(0, ((clientX - rect.left) / rect.width) * 360))
    const newHsv = { ...hsv, h }
    setHsv(newHsv)
    const hex = hsvToHex(newHsv)
    setHexInput(hex)
    onChange(hex)
  }, [hsv, onChange])

  const handlePointerDown = (type: 'satBri' | 'hue', e: React.PointerEvent) => {
    e.preventDefault()
    dragging.current = type
    if (type === 'satBri') updateFromSatBri(e.clientX, e.clientY)
    else updateFromHue(e.clientX)
  }

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (dragging.current === 'satBri') updateFromSatBri(e.clientX, e.clientY)
      else if (dragging.current === 'hue') updateFromHue(e.clientX)
    }
    const handlePointerUp = () => { dragging.current = null }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [updateFromSatBri, updateFromHue])

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setHexInput(val)
    const normalized = val.startsWith('#') ? val : `#${val}`
    if (isValidHex(normalized)) {
      const newHsv = hexToHsv(normalized)
      setHsv(newHsv)
      onChange(normalized)
    }
  }

  const pureHueColor = `hsl(${hsv.h}, 100%, 50%)`

  return (
    <div className="space-y-3">
      <div
        ref={satBriRef}
        className="relative h-32 w-full cursor-crosshair rounded-lg touch-none"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pureHueColor})`,
        }}
        onPointerDown={(e) => handlePointerDown('satBri', e)}
      >
        <div
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: hsvToHex(hsv),
          }}
        />
      </div>

      <div
        ref={hueRef}
        className="relative h-3 w-full cursor-pointer rounded-full touch-none"
        style={{
          background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
        }}
        onPointerDown={(e) => handlePointerDown('hue', e)}
      >
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
          style={{
            left: `${(hsv.h / 360) * 100}%`,
            backgroundColor: pureHueColor,
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 shrink-0 rounded-lg border border-border"
          style={{ backgroundColor: toSafeHexColor(value) }}
        />
        <Input
          value={hexInput}
          onChange={handleHexChange}
          placeholder="#000000"
          className="h-8 flex-1 rounded-lg border-border bg-secondary font-mono text-sm focus:bg-background focus:ring-1 focus:ring-ring/40"
        />
      </div>
    </div>
  )
}

export default function ColorSwatchPicker({ value, onChange, colors = COLOR_PRESETS }: ColorSwatchPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => {
          const isSelected = value === color
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={cn(
                'h-10 w-10 cursor-pointer rounded-full border border-border transition-transform duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-7 sm:w-7',
                isSelected && 'ring-2 ring-offset-2 ring-foreground'
              )}
              style={{ backgroundColor: toSafeHexColor(color) }}
              aria-label={`Select ${color} color`}
            />
          )
        })}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Pipette className="h-4 w-4" />
            Custom color
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <CustomColorPicker value={value} onChange={onChange} />
        </PopoverContent>
      </Popover>
    </div>
  )
}
