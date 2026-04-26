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
import { formatDurationHMS, formatTime } from '@/lib/utils'

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

  const formatTimeWithSeconds = (dateString) => {
    const formatted = formatTime(dateString)
    if (!formatted) {
      return '00:00:00'
    }

    return `${formatted}:00`
  }

  return (
    <section className="space-y-3">
      {entries.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl bg-card py-12 text-center">
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
                className="group flex items-center gap-2 rounded-xl bg-card px-3 py-2 transition-shadow duration-150 hover:shadow-sm"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.projects ? toSafeHexColor(entry.projects.color) : '#d4d4d4' }}
                />

                <div className="flex min-w-0 flex-1 items-center justify-between gap-3 overflow-hidden">
                  <span className="truncate font-mono text-sm text-foreground">
                    {entry.description ? `${entry.description} - ` : ''}
                    {formatTimeWithSeconds(entry.started_at)}
                  </span>
                  <span className="shrink-0 font-mono text-sm text-[#9ca3af]">
                    {formatDurationHMS(entry.duration_seconds ?? 0)}
                  </span>
                </div>

                <div className="hidden items-center gap-1 sm:flex">
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

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Entry actions"
                      disabled={isDeletingId === entry.id}
                      className="text-muted-foreground/70 transition-opacity duration-100 hover:text-foreground"
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
          Total: {formatDurationHMS(totalDuration)}
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
