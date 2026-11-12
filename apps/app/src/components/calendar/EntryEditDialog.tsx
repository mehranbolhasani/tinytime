import { useEffect, useEffectEvent, useState } from 'react'
import DateTimeField from '@/components/calendar/DateTimeField'
import ProjectSelect from '@/components/projects/ProjectSelect'
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
import { useProjects } from '@/hooks/useProjects'
import { useTimeEntryMutations } from '@/hooks/useTimeEntries'
import { computeDuration } from '@/lib/utils'
import type { TimeEntry } from '@/types'

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
  projectId: string | null
  startedAt: string
  stoppedAt: string
}

function createInitialFormState(entry: TimeEntry | null): FormState {
  return {
    description: entry?.description ?? '',
    projectId: entry?.project_id ?? null,
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
  const isRunningEntry = entry?.stopped_at === null
  const [formData, setFormData] = useState<FormState>(createInitialFormState(entry))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const entryId = entry?.id ?? null
  const resetForm = useEffectEvent(() => {
    setFormData(createInitialFormState(entry))
    setError('')
  })

  useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [entryId, open])

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
      const project_id = formData.projectId

      if (!started_at) {
        setError('Please provide a valid start datetime.')
        setIsSaving(false)
        return
      }

      if (isRunningEntry && !stopped_at) {
        if (new Date(started_at).getTime() > Date.now()) {
          setError('Start datetime cannot be in the future.')
          setIsSaving(false)
          return
        }

        await updateEntry(entry.id, {
          description: formData.description,
          project_id,
          started_at,
        })
        handleClose(false)
        return
      }

      if (!stopped_at) {
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
        project_id,
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
      <DialogContent mobileFullscreen className="overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Edit entry</DialogTitle>
          <DialogDescription>
            Update details and times for this entry.
            {isRunningEntry ? ' Leave the stop time empty to keep it running.' : ''}
          </DialogDescription>
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
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="entry-project" className="text-sm font-medium text-muted-foreground">
              Project
            </label>
            <ProjectSelect
              id="entry-project"
              value={formData.projectId}
              onChange={(projectId) => setFormData((prev) => ({ ...prev, projectId }))}
              projects={projects}
            />
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
                placeholder={isRunningEntry ? 'Still running' : undefined}
                required={!isRunningEntry}
              />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              className="bg-secondary hover:bg-border"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
