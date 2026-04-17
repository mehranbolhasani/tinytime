import { useMemo, useState } from 'react'
import { Clock, MoreHorizontal } from 'lucide-react'
import EntryEditDialog from '@/components/calendar/EntryEditDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { hexToRgba, toSafeHexColor } from '@/lib/color'
import { formatDuration, formatDurationOrDash, formatTime } from '@/lib/utils'

export default function EntryList({ entries, deleteEntry, entryTagsByEntryId = {} }) {
  const [editingEntry, setEditingEntry] = useState(null)
  const [isDeletingId, setIsDeletingId] = useState(null)
  const [error, setError] = useState('')

  const totalDuration = useMemo(
    () => entries.reduce((sum, entry) => sum + (entry.duration_seconds ?? 0), 0),
    [entries]
  )

  const handleOpenEdit = (entry) => {
    setEditingEntry(entry)
  }

  const handleDelete = async (id) => {
    setIsDeletingId(id)
    setError('')
    try {
      await deleteEntry(id)
    } catch (deleteError) {
      setError(deleteError?.message ?? 'Unable to delete entry.')
    } finally {
      setIsDeletingId(null)
    }
  }

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-sm font-medium text-muted-foreground">Today&apos;s entries</h2>
      </header>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Clock className="mb-2 h-8 w-8 text-muted-foreground/70" />
          <p className="text-sm text-muted-foreground/70">No entries yet today. Start the timer above.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => {
            const tags = entryTagsByEntryId[entry.id] ?? []
            const visibleTags = tags.slice(0, 2)
            const hiddenTagCount = Math.max(0, tags.length - visibleTags.length)
            return (
              <li
                key={entry.id}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:py-2 transition-shadow duration-150 hover:shadow-sm"
              >
                {entry.projects ? (
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: toSafeHexColor(entry.projects.color) }}
                  />
                ) : (
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-muted-foreground/30" />
                )}

                <div className="flex flex-1 items-center gap-3 overflow-hidden">
                  <span className="flex-1 truncate text-sm font-medium text-foreground">
                    {entry.description || 'No description'}
                  </span>

                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
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
                      {hiddenTagCount > 0 ? (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          +{hiddenTagCount}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <span className="whitespace-nowrap font-mono text-xs text-muted-foreground/70">
                  {formatTime(entry.started_at)} – {formatTime(entry.stopped_at)}
                </span>

                <span className="ml-2 whitespace-nowrap font-mono text-sm font-medium text-muted-foreground">
                  {formatDuration(entry.duration_seconds ?? 0)}
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Entry actions"
                      disabled={isDeletingId === entry.id}
                      className="text-muted-foreground/70 opacity-0 transition-opacity duration-100 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100 hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEdit(entry)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(entry.id)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            )
          })}
        </ul>
      )}

      {entries.length > 0 ? (
        <footer className="text-right text-sm font-medium text-muted-foreground">
          Total: {formatDurationOrDash(totalDuration)}
        </footer>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <EntryEditDialog
        entry={editingEntry}
        open={Boolean(editingEntry)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingEntry(null)
          }
        }}
      />
    </section>
  )
}
