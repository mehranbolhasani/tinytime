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
    <section className="flex flex-col bg-card rounded-2xl overflow-hidden p-1">
      <div className="space-y-6 p-4">
        <input
          type="text"
          placeholder="Describe your work"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={isSubmitting}
          className="h-12 w-full border-b border-input bg-card px-3 text-base text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Select
              value={selectedProject}
              onValueChange={setSelectedProject}
              disabled={isLoadingProjects || isSubmitting || isEntriesLoading}
            >
              <SelectTrigger className="h-8 w-[156px] rounded-md border-input bg-card text-sm">
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
              triggerLabel="No tags"
              showSelectedPills={false}
              className="w-[156px]"
            />
          </div>

          <Button
            type="button"
            variant={timer.isRunning ? 'destructive' : 'default'}
            className="h-8 rounded-md px-4 text-sm font-medium shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
            onClick={timer.isRunning ? handleStop : handleStart}
            disabled={isSubmitting || isEntriesLoading}
          >
            {isSubmitting ? 'Working...' : timer.isRunning ? 'Stop' : 'Start'}
          </Button>
        </div>
      </div>

      <div className="min-h-52 flex items-center justify-center bg-linear-to-b from-transparent via-primary/3 to-primary/5 rounded-xl">
        <span className={cn(
          'block text-center font-pixel text-7xl tracking-loose text-foreground transition-opacity duration-150',
          !timer.isRunning && 'text-foreground'
        )}>
          {timer.isRunning ? formatDurationHMS(timer.elapsed) : '00:00:00'}
        </span>
      </div>

      {isEntriesLoading ? (
        <p className="text-xs text-muted-foreground/80">Loading your current timer state...</p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  )
}
