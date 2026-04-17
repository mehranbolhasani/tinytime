import { formatDate, formatDuration } from '@/lib/utils'

function truncateDescription(text, maxLength = 60) {
  if (!text) {
    return '—'
  }

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength - 1)}…`
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function EntryTable({ entries, entryTagsMap }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground/70">No entries in this period.</p>
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="bg-secondary">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Project</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Description</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Tags</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Duration</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const tags = entryTagsMap[entry.id] ?? []
            const visibleTags = tags.slice(0, 3)
            const hiddenCount = Math.max(0, tags.length - visibleTags.length)

            return (
              <tr key={entry.id} className="border-t border-border transition-colors duration-150 hover:bg-secondary">
                <td className="px-4 py-3 text-muted-foreground">{formatDate(entry.started_at)}</td>
                <td className="px-4 py-3">
                  {entry.projects ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: entry.projects.color ?? '#94a3b8' }}
                      />
                      <span className="text-foreground">{entry.projects.name}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/70">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-foreground">{truncateDescription(entry.description)}</td>
                <td className="px-4 py-3">
                  {tags.length === 0 ? (
                    <span className="text-muted-foreground/70">—</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1">
                      {visibleTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: hexToRgba(tag.color, 0.15),
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                      {hiddenCount > 0 ? (
                        <span className="text-xs text-muted-foreground/70">+{hiddenCount} more</span>
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono font-medium tabular-nums text-foreground">
                  {formatDuration(entry.duration_seconds ?? 0)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
