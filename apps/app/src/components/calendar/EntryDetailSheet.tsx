import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toSafeHexColor } from '@/lib/color'
import { formatDuration, formatTime } from '@/lib/utils'
import type { TimeEntry } from '@/types'

interface EntryDetailSheetProps {
  entry: TimeEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (entry: TimeEntry) => void
  onDuplicate: (entry: TimeEntry) => Promise<void>
  onDelete: (entry: TimeEntry) => void
}

export default function EntryDetailSheet({
  entry,
  open,
  onOpenChange,
  onEdit,
  onDuplicate,
  onDelete,
}: EntryDetailSheetProps) {
  const [duplicateError, setDuplicateError] = useState('')
  const [isDuplicating, setIsDuplicating] = useState(false)

  useEffect(() => {
    setDuplicateError('')
    setIsDuplicating(false)
  }, [entry?.id])

  if (!entry) {
    return null
  }

  const projectColor = toSafeHexColor(entry.projects?.color, '#a8a29e')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl border-0 bg-card p-0 shadow-lg gap-0">
        <SheetTitle className="sr-only">Entry details</SheetTitle>

        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" aria-hidden="true" />
        </div>

        <div className="px-6 pb-6 space-y-4">
          <p className="text-lg font-semibold">
            {entry.description || <span className="text-muted-foreground">No description</span>}
          </p>

          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: projectColor }}
              aria-hidden="true"
            />
            <span className="text-sm text-muted-foreground">
              {entry.projects?.name ?? 'No project'}
            </span>
          </div>

          <div className="text-sm text-muted-foreground">
            {entry.started_at ? formatTime(entry.started_at) : ''}
            {' → '}
            {entry.stopped_at ? formatTime(entry.stopped_at) : ''}
            {entry.duration_seconds != null ? (
              <> • {formatDuration(entry.duration_seconds)}</>
            ) : null}
          </div>

          <div className="space-y-2 pt-2">
            <Button className="w-full" onClick={() => onEdit(entry)}>
              Edit
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={isDuplicating}
              onClick={async () => {
                setDuplicateError('')
                setIsDuplicating(true)
                try {
                  await onDuplicate(entry)
                  onOpenChange(false)
                } catch (err) {
                  setDuplicateError((err as Error)?.message ?? 'Unable to duplicate entry.')
                } finally {
                  setIsDuplicating(false)
                }
              }}
            >
              {isDuplicating ? 'Duplicating...' : 'Duplicate'}
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => onDelete(entry)}
            >
              Delete
            </Button>
          </div>

          {duplicateError ? (
            <p role="alert" className="text-sm text-destructive">{duplicateError}</p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
