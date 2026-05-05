import { useEffect, useState } from 'react'
import DateTimeField from '@/components/calendar/DateTimeField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjects } from '@/hooks/useProjects'
import { useTimeEntryMutations } from '@/hooks/useTimeEntries'
import { toSafeHexColor } from '@/lib/color'
import { computeDuration } from '@/lib/utils'
import type { TimeEntry } from '@/types'

const NO_PROJECT_VALUE = '__no_project__'

function toDateTimeInputValue(dateString: string): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function fromDateTimeInputValue(value: string): string | null {
  if (!value) {
    return null
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate.toISOString()
}

interface FormState {
  description: string
  projectId: string
  startedAt: string
  stoppedAt: string
}

function createInitialFormState(entry: TimeEntry | null): FormState {
  return {
    description: entry?.description ?? '',
    projectId: entry?.project_id ?? NO_PROJECT_VALUE,
    startedAt: entry?.started_at ? toDateTimeInputValue(entry.started_at) : '',
    stoppedAt: entry?.stopped_at ? toDateTimeInputValue(entry.stopped_at) : '',
  }
}

interface EntryEditDialogProps {
  entry: TimeEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function EntryEditDialog({ entry, open, onOpenChange }: EntryEditDialogProps) {
  const { projects } = useProjects()
  const { updateEntry } = useTimeEntryMutations()
  const [formData, setFormData] = useState<FormState>(createInitialFormState(entry))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setFormData(createInitialFormState(entry))
    setError('')
  }, [entry, open])

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsSaving(false)
      setError('')
    }
    onOpenChange(nextOpen)
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!entry) {
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const started_at = fromDateTimeInputValue(formData.startedAt)
      const stopped_at = fromDateTimeInputValue(formData.stoppedAt)

      if (!started_at || !stopped_at) {
        setError('Please provide valid start and stop datetimes.')
        setIsSaving(false)
        return
      }

      if (new Date(stopped_at).getTime() <= new Date(started_at).getTime()) {
        setError('Stop datetime must be after start datetime.')
        setIsSaving(false)
        return
      }

      const duration_seconds = computeDuration(started_at, stopped_at)

      await updateEntry(entry.id, {
        description: formData.description,
        project_id: formData.projectId === NO_PROJECT_VALUE ? null : formData.projectId,
        started_at,
        stopped_at,
        duration_seconds,
      })
      handleClose(false)
    } catch (saveError) {
      setError((saveError as Error)?.message ?? 'Unable to save entry.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-lg [@media(max-width:639px)]:left-0 [@media(max-width:639px)]:top-0 [@media(max-width:639px)]:h-[100dvh] [@media(max-width:639px)]:w-screen [@media(max-width:639px)]:translate-x-0 [@media(max-width:639px)]:translate-y-0 [@media(max-width:639px)]:rounded-none">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Edit entry</DialogTitle>
          <DialogDescription>Update details and times for this entry.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="entry-description" className="text-sm font-medium text-muted-foreground">
              Description
            </label>
            <Input
              id="entry-description"
              value={formData.description}
              onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="What are you working on?"
              className="rounded-lg border-border bg-secondary focus:bg-background focus:ring-1 focus:ring-ring/40"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="entry-project" className="text-sm font-medium text-muted-foreground">
              Project
            </label>
            <Select
              value={formData.projectId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, projectId: value }))}
            >
              <SelectTrigger id="entry-project" className="rounded-lg border-border">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT_VALUE}>No project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: toSafeHexColor(project.color) }}
                      />
                      <span>{project.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="entry-started-at" className="text-sm font-medium text-muted-foreground">
                Start datetime
              </label>
              <DateTimeField
                id="entry-started-at"
                value={formData.startedAt}
                onChange={(value) => setFormData((prev) => ({ ...prev, startedAt: value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="entry-stopped-at" className="text-sm font-medium text-muted-foreground">
                Stop datetime
              </label>
              <DateTimeField
                id="entry-stopped-at"
                value={formData.stoppedAt}
                onChange={(value) => setFormData((prev) => ({ ...prev, stoppedAt: value }))}
                required
              />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              className="rounded-lg bg-secondary text-foreground hover:bg-border"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="rounded-lg">
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
