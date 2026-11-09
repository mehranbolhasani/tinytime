import { toBlock } from '@/lib/calendar'
import { useElapsedSeconds } from '@/hooks/useElapsedSeconds'
import { hexToRgba, toSafeHexColor } from '@/lib/color'
import { formatDurationHMS } from '@/lib/utils'
import type { TimeEntry } from '@/types'

interface ActiveTimerBlockProps {
  activeEntry: TimeEntry
  dayStart: Date
  dayEnd: Date
  hourHeight: number
  minEntryHeight: number
  onClick: () => void
}

export default function ActiveTimerBlock({
  activeEntry,
  dayStart,
  dayEnd,
  hourHeight,
  minEntryHeight,
  onClick,
}: ActiveTimerBlockProps) {
  const elapsed = useElapsedSeconds(activeEntry.started_at)
  const block = toBlock(activeEntry, dayStart, dayEnd, elapsed, minEntryHeight, hourHeight)

  if (!block) {
    return null
  }

  const accentColor = toSafeHexColor(block.entry?.projects?.color, '#e76f51')

  const description = block.entry.description || 'Untitled'
  const projectName = block.entry.projects?.name ?? 'No project'
  const label = `Active timer: ${description} — ${projectName}`

  return (
    <button
      data-entry-block
      type="button"
      aria-label={label}
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
      <p className="truncate text-[11px] font-medium tabular-nums text-foreground">{formatDurationHMS(elapsed)}</p>
    </button>
  )
}
