import { hexToRgba, toSafeHexColor } from '@/lib/color'
import { cn, formatDuration } from '@/lib/utils'

export default function EntryBlock({
  block,
  onClick,
  onContextMenu,
  onDragStart,
  onDragEnd,
  isDragging = false,
  tags = [],
}) {
  const width = block.hasOverlap ? 'calc(50% - 12px)' : 'calc(100% - 24px)'
  const left = block.hasOverlap ? `${block.lane * 50}%` : '1%'
  const canShowTags = block.height > 48
  const projectColor = toSafeHexColor(block.entry?.projects?.color, '#a8a29e')

  return (
    <button
      data-entry-block
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDragStart={(event) => onDragStart?.(event, block.entry)}
      onDragEnd={onDragEnd}
      draggable
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
      {canShowTags && tags.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full px-1.5 py-0 text-[10px] font-medium"
              style={{ color: tag.color, backgroundColor: hexToRgba(tag.color, 0.15) }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      ) : null}
      <p className="truncate text-[11px] text-muted-foreground">
        {formatDuration(block.entry.duration_seconds ?? 0)}
      </p>
    </button>
  )
}
