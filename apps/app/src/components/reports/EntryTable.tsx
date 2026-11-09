import { useState } from 'react'
import EntryDetailsDialog from '@/components/reports/EntryDetailsDialog'
import { toSafeHexColor } from '@/lib/color'
import { formatDate, formatDuration } from '@/lib/utils'
import type { TimeEntry } from '@/types'

function truncateDescription(text: string | null | undefined, maxLength = 60): string {
  if (!text) {
    return '—'
  }

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength - 1)}…`
}

interface EntryTableProps {
  entries: TimeEntry[]
}

export default function EntryTable({ entries }: EntryTableProps) {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)

  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? null

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground/70">No entries in this period.</p>
  }

  return (
    <>
      <div className="space-y-2 sm:hidden">
        {entries.map((entry) => {
          return (
            <button
              key={entry.id}
              type="button"
              aria-label={`${entry.description || 'Untitled'} — ${entry.projects?.name ?? 'No project'}`}
              onClick={() => setSelectedEntryId(entry.id)}
              className="w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary active:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{formatDate(entry.started_at)}</span>
                <span className="text-sm font-medium tabular-nums text-foreground">{formatDuration(entry.duration_seconds ?? 0)}</span>
              </span>
              <span className="mt-1 block text-sm font-medium text-foreground">{truncateDescription(entry.description, 90)}</span>
              <span className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
                {entry.projects ? (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: toSafeHexColor(entry.projects.color, '#94a3b8') }}
                    aria-hidden="true"
                  />
                ) : null}
                <span>{entry.projects?.name ?? 'No project'}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="hidden rounded-2xl border border-border bg-card sm:block">
        <table aria-label="Time entries" className="w-full table-fixed text-sm">
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
                  aria-label={`${entry.description || 'Untitled'} — ${entry.projects?.name ?? 'No project'}`}
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
                          style={{ backgroundColor: toSafeHexColor(entry.projects.color, '#94a3b8') }}
                        />
                        <span className="text-foreground">{entry.projects.name}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/70">—</span>
                    )}
                  </td>
                  <td className="w-28 px-4 py-3 text-right font-medium tabular-nums text-foreground">
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
