import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Clock, MoreHorizontal } from 'lucide-react'
import EntryEditDialog from '@/components/calendar/EntryEditDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toSafeHexColor } from '@/lib/color'
import { presets } from '@/lib/motion'
import { formatDurationHMS, formatTime } from '@/lib/utils'
import type { TimeEntry } from '@/types'

interface EntryListProps {
  entries: TimeEntry[]
  deleteEntry: (id: string) => Promise<string>
}

export default function EntryList({ entries, deleteEntry }: EntryListProps) {
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

  const formatTimeWithSeconds = (dateString: string) => {
    const formatted = formatTime(dateString)
    if (!formatted) {
      return '00:00:00'
    }

    return `${formatted}:00`
  }

  return (
    <section className="flex flex-col gap-2">
      <AnimatePresence mode="wait" initial={false}>
        {entries.length === 0 ? (
          <motion.div
            key="entry-list-empty"
            variants={presets.panelSwap.variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={presets.panelSwap.transition}
            className="flex flex-col items-center rounded-xl bg-card py-12 text-center"
          >
            <Clock className="mb-2 h-8 w-8 text-muted-foreground/70" />
            <p className="text-sm text-muted-foreground/70">No entries yet today. Start the timer above.</p>
          </motion.div>
        ) : (
          <motion.ul
            key="entry-list-populated"
            variants={presets.panelSwap.variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={presets.panelSwap.transition}
            className="flex flex-col gap-2"
          >
            <AnimatePresence initial={false}>
              {entries.map((entry) => {
                return (
                  <motion.li
                    key={entry.id}
                    layout
                    variants={presets.listItem.variants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={presets.listItem.transition}
                    className="overflow-hidden"
                  >
                    <div className="group flex items-center gap-2 rounded-xl bg-card px-3 py-2 transition-shadow duration-150 hover:shadow-sm">
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
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </motion.ul>
        )}
      </AnimatePresence>

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
