import { useState } from 'react'
import EntryDetailsDialog from '@/components/reports/EntryDetailsDialog'
import { hexToRgba } from '@/lib/color'
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

export default function EntryTable({ entries, entryTagsMap }) {
  const [selectedEntryId, setSelectedEntryId] = useState(null)

  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? null
  const selectedEntryTags = selectedEntry ? (entryTagsMap[selectedEntry.id] ?? []) : []

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground/70">No entries in this period.</p>
  }

  return (
    <>
      <div className="space-y-2 sm:hidden">
        {entries.map((entry) => {
          const tags = entryTagsMap[entry.id] ?? []
          const visibleTags = tags.slice(0, 2)
          const hiddenCount = Math.max(0, tags.length - visibleTags.length)

          return (
            <article key={entry.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{formatDate(entry.started_at)}</p>
                <p className="font-mono text-sm font-medium text-foreground">{formatDuration(entry.duration_seconds ?? 0)}</p>
              </div>
              <p className="mt-1 text-sm font-medium text-foreground">{truncateDescription(entry.description, 90)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {entry.projects?.name ?? 'No project'}
              </p>
              {tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-1">
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
              ) : null}
            </article>
          )
        })}
      </div>

      <div className="hidden rounded-2xl border border-border bg-card sm:block">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="bg-secondary">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Project</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground/70">Duration</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              return (
                <tr
                  key={entry.id}
                  tabIndex={0}
                  role="button"
                  onClick={() => setSelectedEntryId(entry.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedEntryId(entry.id)
                    }
                  }}
                  className="cursor-pointer border-t border-border transition-colors duration-150 hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                >
                  <td className="px-4 py-3 text-foreground">{truncateDescription(entry.description)}</td>
                  <td className="px-4 py-3 truncate">
                    {entry.projects ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: entry.projects.color ?? 'var(--muted-foreground)' }}
                        />
                        <span className="text-foreground">{entry.projects.name}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/70">—</span>
                    )}
                  </td>
                  <td className="w-28 px-4 py-3 text-right font-mono font-medium tabular-nums text-foreground">
                    {formatDuration(entry.duration_seconds ?? 0)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <EntryDetailsDialog
        entry={selectedEntry}
        tags={selectedEntryTags}
        open={Boolean(selectedEntry)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedEntryId(null)
          }
        }}
      />
    </>
  )
}
