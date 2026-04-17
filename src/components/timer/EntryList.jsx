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
import { cn, formatDuration, formatTime } from '@/lib/utils'

const COLOR_CLASSES = {
  '#6366f1': 'bg-[#6366f1]',
  '#f59e0b': 'bg-[#f59e0b]',
  '#10b981': 'bg-[#10b981]',
  '#ef4444': 'bg-[#ef4444]',
  '#3b82f6': 'bg-[#3b82f6]',
  '#ec4899': 'bg-[#ec4899]',
  '#8b5cf6': 'bg-[#8b5cf6]',
  '#14b8a6': 'bg-[#14b8a6]',
}

function getColorClass(color) {
  return COLOR_CLASSES[color] ?? 'bg-muted'
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

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
            return (
              <li
                key={entry.id}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-shadow duration-150 hover:shadow-sm"
              >
                {entry.projects ? (
                  <span
                    className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', getColorClass(entry.projects.color))}
                  />
                ) : (
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-muted-foreground/30" />
                )}

                <div className="flex flex-1 items-center gap-3 overflow-hidden">
                  <span className="flex-1 truncate text-sm font-medium text-foreground">
                    {entry.description || 'No description'}
                  </span>

                  {tags.length > 0 ? (
                    <div className="hidden flex-wrap gap-1 sm:flex">
                      {tags.map((tag) => (
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
                      className="opacity-0 transition-opacity duration-100 group-hover:opacity-100 text-muted-foreground/70 hover:text-foreground"
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
          Total: {formatDuration(totalDuration)}
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
