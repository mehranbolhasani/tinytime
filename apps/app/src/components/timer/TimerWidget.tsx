import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjects } from '@/hooks/useProjects'
import { useTimerContext } from '@/contexts/TimerContext'
import { toSafeHexColor } from '@/lib/color'
import { presets } from '@/lib/motion'
import { cn, formatDurationHMS } from '@/lib/utils'
import type { TimeEntry } from '@/types'

const NO_PROJECT_VALUE = '__no_project__'

function normalizeProjectValue(projectId: string | null | undefined): string {
  return projectId ?? NO_PROJECT_VALUE
}

interface TimerWidgetProps {
  createEntry: (input: { project_id: string | null; description: string; started_at: string }) => Promise<TimeEntry>
  stopEntry: (id: string, stopped_at: string) => Promise<TimeEntry>
  isEntriesLoading?: boolean
}

export default function TimerWidget({ createEntry, stopEntry, isEntriesLoading = false }: TimerWidgetProps) {
  const { projects, isLoading: isLoadingProjects } = useProjects()
  const timer = useTimerContext()
  const activeEntry = timer.activeEntry
  const [description, setDescription] = useState(activeEntry?.description ?? '')
  const [selectedProject, setSelectedProject] = useState(normalizeProjectValue(activeEntry?.project_id))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setDescription(activeEntry?.description ?? '')
    setSelectedProject(normalizeProjectValue(activeEntry?.project_id))
  }, [activeEntry])

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
        await stopEntry(activeEntry.id, forcedStoppedAt)
        timer.reset()
      }

      const created = await createEntry({
        project_id: selectedProjectId,
        description,
        started_at: new Date().toISOString(),
      })
      timer.start(created)
    } catch (startError) {
      setError((startError as Error)?.message ?? 'Unable to start timer.')
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
      await stopEntry(activeEntry.id, stoppedAt)
      timer.reset()
    } catch (stopError) {
      timer.start(activeEntry)
      setError((stopError as Error)?.message ?? 'Unable to stop timer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayTime = timer.isRunning ? formatDurationHMS(timer.elapsed) : '00:00:00'
  const [hours = '00', minutes = '00', seconds = '00'] = displayTime.split(':')
  const runningDescription = activeEntry?.description?.trim()
  const runningProjectName = activeEntry?.projects?.name ?? 'No project'
  const runningProjectColor = activeEntry?.projects?.color
    ? toSafeHexColor(activeEntry.projects.color)
    : null

  return (
    <section className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl bg-card">
        <div className="flex items-center justify-center py-6">
          <span
            role="status"
            aria-label={`Timer: ${displayTime}`}
            className={cn(
              'block text-center font-pixel text-7xl font-bold',
              timer.isRunning ? 'text-foreground' : 'text-muted-foreground/40'
            )}
          >
            <span>{hours}</span>
            <span className="inline-block -translate-y-2">:</span>
            <span>{minutes}</span>
            <span className="inline-block -translate-y-2">:</span>
            <span>{seconds}</span>
          </span>
        </div>

        <div className="min-h-[132px] border-t border-dotted border-border">
          <AnimatePresence mode="wait" initial={false}>
            {timer.isRunning ? (
              <motion.div
                key="running"
                className="flex min-h-[132px] items-stretch"
                variants={presets.panelSwap.variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={presets.panelSwap.transition}
              >
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-3">
                  <p
                    className={cn(
                      'truncate text-base',
                      runningDescription ? 'text-foreground' : 'italic text-muted-foreground/70'
                    )}
                  >
                    {runningDescription || 'Untitled session'}
                  </p>
                  <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <span
                      className={cn(
                        'h-2.5 w-2.5 rounded-full',
                        !runningProjectColor && 'border border-border bg-transparent'
                      )}
                      style={runningProjectColor ? { backgroundColor: runningProjectColor } : undefined}
                    />
                    <span>{runningProjectName}</span>
                  </p>
                </div>
                <div className="grid h-auto w-[120px] min-w-[120px] shrink-0 place-items-center p-1">
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-full w-full min-w-full rounded-xl px-4 text-sm font-normal"
                    onClick={handleStop}
                    disabled={isSubmitting || isEntriesLoading}
                  >
                    <span className="inline-flex min-w-14 justify-center">
                      {isSubmitting ? 'Working...' : 'Stop'}
                    </span>
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                className="flex min-h-[132px] items-stretch"
                variants={presets.panelSwap.variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={presets.panelSwap.transition}
              >
                <div className="flex flex-1 flex-col items-stretch">
                  <input
                    type="text"
                    aria-label="Work description"
                    placeholder="Describe your work"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={isSubmitting || isEntriesLoading}
                    className="h-16 w-full border-b border-dotted border-border bg-card px-4 text-base text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none"
                  />
                  <div className="flex h-16 w-full min-w-0 items-stretch">
                    <Select
                      value={selectedProject}
                      onValueChange={setSelectedProject}
                      disabled={isLoadingProjects || isSubmitting || isEntriesLoading}
                    >
                      <SelectTrigger className="h-full w-full border-none rounded-none bg-card text-sm focus-visible:outline-none focus-visible:ring-0 focus-visible:border-none focus:ring-0 focus:outline-none">
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
                </div>
                <div className="grid h-auto w-[120px] min-w-[120px] shrink-0 place-items-center p-1">
                  <Button
                    type="button"
                    variant="default"
                    className="h-full w-full min-w-full rounded-xl px-4 text-sm font-normal"
                    onClick={handleStart}
                    disabled={isSubmitting || isEntriesLoading}
                  >
                    <span className="inline-flex min-w-14 justify-center">
                      {isSubmitting ? 'Working...' : 'Start'}
                    </span>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {isEntriesLoading ? (
        <p className="text-xs text-muted-foreground/80">Loading your current timer state...</p>
      ) : null}

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </section>
  )
}
