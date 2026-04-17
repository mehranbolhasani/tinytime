import { useEffect, useState } from 'react'
import TagSelector from '@/components/tags/TagSelector'
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
import { useTags } from '@/hooks/useTags'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { cn, computeDuration } from '@/lib/utils'

const NO_PROJECT_VALUE = '__no_project__'

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

function toTimeInputValue(dateString) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) {
    return '00:00'
  }

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function mergeDateAndTime(baseDateString, timeValue) {
  const date = new Date(baseDateString)
  const [hours, minutes] = timeValue.split(':').map((value) => Number.parseInt(value, 10))

  date.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0)

  return date.toISOString()
}

function createInitialFormState(entry) {
  return {
    description: entry?.description ?? '',
    projectId: entry?.project_id ?? NO_PROJECT_VALUE,
    startedAtTime: entry?.started_at ? toTimeInputValue(entry.started_at) : '00:00',
    stoppedAtTime: entry?.stopped_at ? toTimeInputValue(entry.stopped_at) : '00:00',
  }
}

export default function EntryEditDialog({ entry, open, onOpenChange }) {
  const { projects } = useProjects()
  const { tags, getEntryTags, setEntryTags } = useTags()
  const { updateEntry } = useTimeEntries({})
  const [formData, setFormData] = useState(createInitialFormState(entry))
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setFormData(createInitialFormState(entry))
    setError('')
  }, [entry, open])

  useEffect(() => {
    if (!open || !entry?.id) {
      setSelectedTagIds([])
      return
    }

    let isCurrent = true

    const loadEntryTags = async () => {
      try {
        const entryTags = await getEntryTags(entry.id)
        if (isCurrent) {
          setSelectedTagIds(entryTags.map((tag) => tag.id))
        }
      } catch (loadError) {
        if (isCurrent) {
          setError(loadError?.message ?? 'Unable to load tags.')
        }
      }
    }

    loadEntryTags()

    return () => {
      isCurrent = false
    }
  }, [entry, getEntryTags, open])

  const handleClose = (nextOpen) => {
    if (!nextOpen) {
      setIsSaving(false)
      setError('')
    }
    onOpenChange(nextOpen)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!entry) {
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const started_at = mergeDateAndTime(entry.started_at, formData.startedAtTime)
      let stopped_at = mergeDateAndTime(entry.stopped_at ?? started_at, formData.stoppedAtTime)

      if (new Date(stopped_at).getTime() < new Date(started_at).getTime()) {
        const nextDayStop = new Date(stopped_at)
        nextDayStop.setDate(nextDayStop.getDate() + 1)
        stopped_at = nextDayStop.toISOString()
      }

      const duration_seconds = computeDuration(started_at, stopped_at)

      await updateEntry(entry.id, {
        description: formData.description,
        project_id: formData.projectId === NO_PROJECT_VALUE ? null : formData.projectId,
        started_at,
        stopped_at,
        duration_seconds,
      })
      await setEntryTags(entry.id, selectedTagIds)
      handleClose(false)
    } catch (saveError) {
      setError(saveError?.message ?? 'Unable to save entry.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-2xl border-border shadow-md">
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
              className="rounded-lg border-border bg-secondary focus:bg-white focus:ring-1 focus:ring-ring/40"
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
                      <span className={cn('h-2.5 w-2.5 rounded-full', getColorClass(project.color))} />
                      <span>{project.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="entry-started-at" className="text-sm font-medium text-muted-foreground">
                Start time
              </label>
              <Input
                id="entry-started-at"
                type="time"
                value={formData.startedAtTime}
                onChange={(event) => setFormData((prev) => ({ ...prev, startedAtTime: event.target.value }))}
                required
                className="rounded-lg border-border bg-secondary focus:bg-white focus:ring-1 focus:ring-ring/40"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="entry-stopped-at" className="text-sm font-medium text-muted-foreground">
                Stop time
              </label>
              <Input
                id="entry-stopped-at"
                type="time"
                value={formData.stoppedAtTime}
                onChange={(event) => setFormData((prev) => ({ ...prev, stoppedAtTime: event.target.value }))}
                required
                className="rounded-lg border-border bg-secondary focus:bg-white focus:ring-1 focus:ring-ring/40"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">Tags</p>
            <TagSelector
              tags={tags}
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
              disabled={isSaving}
            />
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
            <Button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-primary text-white hover:bg-primary/90"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
