import { motion } from 'motion/react'
import { hexToRgba, toSafeHexColor } from '@/lib/color'
import { easings } from '@/lib/motion'
import { cn, formatDuration } from '@/lib/utils'
import type { CalendarBlock, TimeEntry } from '@/types'

interface EntryBlockProps {
  block: CalendarBlock
  onClick: () => void
  onContextMenu: (event: React.MouseEvent) => void
  onDragStart?: (event: React.DragEvent, entry: TimeEntry) => void
  onDragEnd?: () => void
  isDragging?: boolean
}

export default function EntryBlock({
  block,
  onClick,
  onContextMenu,
  onDragStart,
  onDragEnd,
  isDragging = false,
}: EntryBlockProps) {
  const width = block.hasOverlap ? 'calc(50% - 12px)' : 'calc(100% - 24px)'
  const left = block.hasOverlap ? `${block.lane * 50}%` : '1%'
  const projectColor = toSafeHexColor(block.entry?.projects?.color, '#a8a29e')

  return (
    <motion.button
      data-entry-block
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDragStart={(event) => onDragStart?.(event as unknown as React.DragEvent, block.entry)}
      onDragEnd={onDragEnd}
      draggable
      layout
      transition={easings.spring}
      className={cn(
        'absolute cursor-grab overflow-hidden rounded-r-lg border-l-2 px-2 py-2 text-left text-[11px] transition-shadow duration-150 hover:shadow-sm active:cursor-grabbing flex flex-col gap-0',
        isDragging ? 'opacity-0 ring-0' : null
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
      <p className="truncate text-xs font-semibold" style={{ color: projectColor }}>
        {block.entry.projects?.name ?? 'No project'}
      </p>
      <p className="truncate text-[11px] text-muted-foreground">{block.entry.description || 'No description'}</p>
      <p className="truncate text-[11px] text-muted-foreground">
        {formatDuration(block.entry.duration_seconds ?? 0)}
      </p>
    </motion.button>
  )
}
