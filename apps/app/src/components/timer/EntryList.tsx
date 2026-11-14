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
import { Skeleton } from '@/components/ui/skeleton'
import { toSafeHexColor } from '@/lib/color'
import { formatDurationHMS, formatTime } from '@/lib/utils'
import type { TimeEntry } from '@/types'

interface EntryListProps {
  entries: TimeEntry[]
  deleteEntry: (id: string) => Promise<string>
  onContinueEntry?: (entry: TimeEntry) => void
  onPinEntry?: (entry: TimeEntry) => void
  onUnpinEntry?: (id: string) => void
  isFavourite?: (entry: TimeEntry) => boolean
}

export default function EntryList({ entries, deleteEntry, onContinueEntry, onPinEntry, onUnpinEntry, isFavourite }: EntryListProps) {
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const totalDuration = useMemo(
    () => entries.reduce((sum, entry) => sum + (entry.duration_seconds ?? 0), 0),
    [entries]
  )

  const handleOpenEdit = (entry: TimeEntry) => {
    setEditingEntry(entry)
  }

  const handleDelete = async (id: string) => {
    setIsDeletingId(id)
    setError('')
    try {
      await deleteEntry(id)
    } catch (deleteError) {
      setError((deleteError as Error)?.message ?? 'Unable to delete entry.')
    } finally {
      setIsDeletingId(null)
    }
  }

  return (
    <section className="flex flex-col gap-2 items-center">
      {entries.length === 0 ? (
        <div className="flex flex-col items-center p-4 text-center w-2/3">
          <Clock className="mb-4 h-8 w-8 text-foreground" />
          <p className="text-md text-foreground">No entries yet today. Start the timer above.</p>
        </div>
      ) : (
        <ul className="flex w-full flex-col gap-2">
          {entries.map((entry) => {
            return (
              <li key={entry.id} className="overflow-hidden">
                <div className="group flex h-12 items-center gap-2 rounded-xl bg-card px-3 transition-shadow duration-150 hover:shadow-sm">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.projects ? toSafeHexColor(entry.projects.color) : '#d4d4d4' }}
                  />

                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3 overflow-hidden">
                    <span className="truncate text-sm tabular-nums text-foreground">
                      {entry.description ? `${entry.description} - ` : ''}
                      {formatTime(entry.started_at)}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-[#9ca3af]">
                      {formatDurationHMS(entry.duration_seconds ?? 0)}
                    </span>
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
                      {onContinueEntry ? (
                        <DropdownMenuItem onClick={() => onContinueEntry(entry)}>
                          Continue
                        </DropdownMenuItem>
                      ) : null}
                      {isFavourite?.(entry) ? (
                        <DropdownMenuItem onClick={() => onUnpinEntry?.(entry.id)}>
                          Unpin
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => onPinEntry?.(entry)}>
                          Pin as favourite
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleOpenEdit(entry)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(entry.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </div>
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

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

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

/** Same shape as the list it replaces, so the column does not resize on load. */
export function EntryListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section className="flex flex-col gap-2 items-center">
      <ul className="flex w-full flex-col gap-2" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <li key={`entry-skeleton-${index}`}>
            <Skeleton className="h-12 w-full rounded-xl" />
          </li>
        ))}
      </ul>
    </section>
  )
}
