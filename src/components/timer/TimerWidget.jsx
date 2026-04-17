import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjects } from '@/hooks/useProjects'
import TagSelector from '@/components/tags/TagSelector'
import { useTags } from '@/hooks/useTags'
import { useTimerContext } from '@/contexts/TimerContext'
import { toSafeHexColor } from '@/lib/color'
import { cn, formatDurationHMS } from '@/lib/utils'

const NO_PROJECT_VALUE = '__no_project__'

function normalizeProjectValue(projectId) {
  return projectId ?? NO_PROJECT_VALUE
}

export default function TimerWidget({ createEntry, stopEntry, isEntriesLoading = false }) {
  const { projects, isLoading: isLoadingProjects } = useProjects()
  const { tags, isLoading: isLoadingTags, getEntryTags, setEntryTags } = useTags()
  const timer = useTimerContext()
  const activeEntry = timer.activeEntry
  const [description, setDescription] = useState(activeEntry?.description ?? '')
  const [selectedProject, setSelectedProject] = useState(normalizeProjectValue(activeEntry?.project_id))
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activeEntry?.id) {
      setSelectedTagIds([])
      return
    }

    let isCurrent = true

    setDescription(activeEntry.description ?? '')
    setSelectedProject(normalizeProjectValue(activeEntry.project_id))

    const loadEntryTags = async () => {
      try {
        const entryTags = await getEntryTags(activeEntry.id)
        if (isCurrent) {
          setSelectedTagIds(entryTags.map((tag) => tag.id))
        }
      } catch {
        if (isCurrent) {
          setSelectedTagIds([])
        }
      }
    }

    loadEntryTags()

    return () => {
      isCurrent = false
    }
  }, [activeEntry, getEntryTags])

  const selectedProjectId = useMemo(
    () => (selectedProject === NO_PROJECT_VALUE ? null : selectedProject),
    [selectedProject]
  )

  const handleStart = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      if (activeEntry) {
        const forcedStoppedAt = new Date().toISOString()
        const stoppedEntry = await stopEntry(activeEntry.id, forcedStoppedAt)
        await setEntryTags(stoppedEntry.id, selectedTagIds)
        setSelectedTagIds([])
        timer.reset()
      }

      const created = await createEntry({
        project_id: selectedProjectId,
        description,
        started_at: new Date().toISOString(),
      })
      timer.start(created)
    } catch (startError) {
      setError(startError?.message ?? 'Unable to start timer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStop = async () => {
    if (!activeEntry) {
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const stoppedAt = timer.stop()
      const stoppedEntry = await stopEntry(activeEntry.id, stoppedAt)
      await setEntryTags(stoppedEntry.id, selectedTagIds)
      setSelectedTagIds([])
      timer.reset()
    } catch (stopError) {
      timer.start(activeEntry)
      setError(stopError?.message ?? 'Unable to stop timer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="space-y-5 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <input
          type="text"
          placeholder="What are you working on?"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={isSubmitting}
          className="w-full min-w-0 border-0 bg-transparent text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-0"
        />
        <Select
          value={selectedProject}
          onValueChange={setSelectedProject}
          disabled={isLoadingProjects || isSubmitting || isEntriesLoading}
        >
          <SelectTrigger className="w-full rounded-full border-border text-sm sm:w-56">
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

        <TagSelector
          tags={tags}
          selectedTagIds={selectedTagIds}
          onChange={setSelectedTagIds}
          disabled={isSubmitting || isLoadingTags || isEntriesLoading}
          className="w-full sm:w-auto"
        />
      </div>


      {isEntriesLoading ? (
        <p className="text-xs text-muted-foreground/70">Loading your current timer state...</p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <span className={cn(
          'font-mono text-2xl font-semibold tracking-tight text-foreground transition-opacity duration-150 sm:text-3xl',
          !timer.isRunning && 'text-muted-foreground/70'
        )}>
          {timer.isRunning ? formatDurationHMS(timer.elapsed) : '00:00:00'}
        </span>

        <Button
          type="button"
          className={cn(
            'w-full rounded-xl px-6 py-2.5 text-sm font-medium text-white transition-transform duration-100 active:scale-95 sm:min-w-32 sm:w-auto',
            timer.isRunning
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-primary hover:bg-primary/90'
          )}
          onClick={timer.isRunning ? handleStop : handleStart}
          disabled={isSubmitting || isEntriesLoading}
        >
          {isSubmitting ? 'Working...' : timer.isRunning ? 'Stop' : 'Start'}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  )
}
