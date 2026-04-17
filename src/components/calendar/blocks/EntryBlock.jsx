import { hexToRgba, toSafeHexColor } from '@/lib/color'
import { formatDuration } from '@/lib/utils'

export default function EntryBlock({ block, onClick, tags = [] }) {
  const width = block.hasOverlap ? 'calc(50% - 6px)' : 'calc(100% - 8px)'
  const left = block.hasOverlap ? `${block.lane * 50}%` : '0%'
  const canShowTags = block.height > 48
  const projectColor = toSafeHexColor(block.entry?.projects?.color, '#a8a29e')

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute overflow-hidden rounded-lg border-l-2 px-2 py-1 text-left text-[11px] cursor-pointer transition-shadow duration-150 hover:shadow-sm"
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
