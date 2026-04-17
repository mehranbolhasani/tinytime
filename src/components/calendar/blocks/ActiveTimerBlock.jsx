import { hexToRgba, toSafeHexColor } from '@/lib/color'
import { formatDurationHMS } from '@/lib/utils'

export default function ActiveTimerBlock({ block, elapsed, onClick }) {
  const accentColor = toSafeHexColor(block.entry?.projects?.color, '#e76f51')

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-0 overflow-hidden rounded-lg border border-dashed p-2 text-left text-[11px] shadow-sm"
      style={{
        top: block.top,
        left: 0,
        width: 'calc(100% - 8px)',
        height: block.height,
        borderColor: accentColor,
        backgroundColor: hexToRgba(accentColor, 0.1),
      }}
    >
      <p className="truncate text-xs font-semibold text-foreground">
        {block.entry.projects?.name ?? 'Active timer'}
      </p>
      <p className="truncate text-[11px] text-muted-foreground">
        {block.entry.description || 'No description'}
      </p>
      <p className="truncate text-[11px] font-medium font-mono text-foreground">{formatDurationHMS(elapsed)}</p>
    </button>
  )
}
