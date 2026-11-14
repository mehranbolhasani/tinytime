import { memo } from 'react'
import { hexToRgba, toSafeHexColor } from '@/lib/color'
import { cn, formatDuration } from '@/lib/utils'
import type { CalendarBlock, TimeEntry } from '@/types'

interface EntryBlockProps {
  block: CalendarBlock
  onSelect: (entry: TimeEntry) => void
  onOpenMenu: (
    entry: TimeEntry,
    x: number,
    y: number,
    returnFocusTo?: HTMLElement | null
  ) => void
  onDragStart?: (event: React.DragEvent, entry: TimeEntry) => void
  onDragEnd?: () => void
  isDragging?: boolean
  /** Shown while the selected day is still loading: faded and not interactive. */
  isStale?: boolean
}

function EntryBlock({
  block,
  onSelect,
  onOpenMenu,
  onDragStart,
  onDragEnd,
  isDragging = false,
  isStale = false,
}: EntryBlockProps) {
  const laneCount = Math.max(1, block.laneCount)
  const width = `calc((100% - 24px) / ${laneCount} - 4px)`
  const left = `calc(12px + ((100% - 24px) / ${laneCount}) * ${block.lane})`
  const projectColor = toSafeHexColor(block.entry?.projects?.color, '#a8a29e')

  const label = `${block.entry.description || 'Untitled'} — ${block.entry.projects?.name ?? 'No project'}`

  return (
    <button
      data-entry-block
      type="button"
      aria-label={label}
      onClick={() => {
        if (isStale) return
        onSelect(block.entry)
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        onOpenMenu(block.entry, event.clientX, event.clientY, event.currentTarget)
      }}
      onKeyDown={(event) => {
        if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
          event.preventDefault()
          const rect = event.currentTarget.getBoundingClientRect()
          onOpenMenu(block.entry, rect.left + 8, rect.bottom, event.currentTarget)
        }
      }}
      onDragStart={(event) => onDragStart?.(event, block.entry)}
      onDragEnd={onDragEnd}
      draggable={!isStale}
      className={cn(
        'absolute cursor-grab overflow-hidden rounded-lg px-2 py-2 text-left text-[12px] transition-shadow duration-150 hover:shadow-sm active:cursor-grabbing flex flex-col gap-0',
        isDragging ? 'opacity-0 ring-0' : null,
        isStale ? 'opacity-50' : null
      )}
      style={{
        top: block.top,
        height: block.height,
        left,
        width,
        backgroundColor: hexToRgba(projectColor, 0.15),
        borderLeftColor: projectColor,
      }}
    >
      <p className="truncate text-sm font-semibold" style={{ color: projectColor }}>
        {block.entry.projects?.name ?? 'No project'}
      </p>
      <p className="truncate text-[12px] text-muted-foreground">{block.entry.description || 'No description'}</p>
      <p className="truncate text-[12px] text-muted-foreground">
        {formatDuration(block.entry.duration_seconds ?? 0)}
      </p>
    </button>
  )
}

export default memo(EntryBlock)
