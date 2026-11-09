import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LoaderCircle, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import TimerDisplay from '@/components/timer/TimerDisplay'
import { useProjects } from '@/hooks/useProjects'
import { useTimerControlActions } from '@/hooks/useTimerControlActions'
import { useTimerContext } from '@/contexts/TimerContext'
import { toSafeHexColor } from '@/lib/color'
import { presets } from '@/lib/motion'
import { isOptimisticEntry } from '@/lib/timer'
import { cn } from '@/lib/utils'

const NO_PROJECT_VALUE = '__no_project__'

function normalizeProjectValue(projectId: string | null | undefined): string {
  return projectId ?? NO_PROJECT_VALUE
}

interface TimerWidgetProps {
  isEntriesLoading?: boolean
}

export default function TimerWidget({ isEntriesLoading = false }: TimerWidgetProps) {
  const { projects, isLoading: isLoadingProjects } = useProjects()
  const timer = useTimerContext()
  const activeEntry = timer.activeEntry
  const [description, setDescription] = useState(activeEntry?.description ?? '')
  const [selectedProject, setSelectedProject] = useState(normalizeProjectValue(activeEntry?.project_id))
  const { isSubmitting, error, startTimer, stopTimer, updateRunningEntry } = useTimerControlActions()
  const skipDescriptionCommitRef = useRef(false)
  const syncKey = activeEntry
    ? `${activeEntry.id}|${activeEntry.description ?? ''}|${activeEntry.project_id ?? ''}`
    : 'idle'
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey)

  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey)
    setDescription(activeEntry?.description ?? '')
    setSelectedProject(normalizeProjectValue(activeEntry?.project_id))
  }

  const selectedProjectId = useMemo(
    () => (selectedProject === NO_PROJECT_VALUE ? null : selectedProject),
    [selectedProject]
  )
  const isOptimistic = activeEntry ? isOptimisticEntry(activeEntry) : false
  const runningDisabled = isSubmitting || isEntriesLoading || isOptimistic

  const handleStart = () => {
    if (isSubmitting || isEntriesLoading) {
      return
    }

    void startTimer({
      projectId: selectedProjectId,
      description,
    })
  }

  const handleStop = () => {
    void stopTimer()
  }

  const handleDescriptionCommit = () => {
    if (skipDescriptionCommitRef.current) {
      skipDescriptionCommitRef.current = false
      return
    }

    if (!activeEntry || runningDisabled) {
      return
    }

    const nextDescription = description.trim()
    const currentDescription = activeEntry.description ?? ''

    if (nextDescription === currentDescription) {
      if (description !== currentDescription) {
        setDescription(currentDescription)
      }
      return
    }

    void updateRunningEntry({ description: nextDescription })
  }

  const handleRunningProjectChange = (value: string) => {
    setSelectedProject(value)

    if (!activeEntry || runningDisabled) {
      return
    }

    const projectId = value === NO_PROJECT_VALUE ? null : value
    if (projectId === (activeEntry.project_id ?? null)) {
      return
    }

    void updateRunningEntry({ projectId })
  }

  const selectedProjectMeta =
    selectedProject === NO_PROJECT_VALUE
      ? null
      : projects.find((project) => project.id === selectedProject) ??
        (activeEntry?.project_id === selectedProject ? activeEntry.projects : null)
  const runningProjectColor = selectedProjectMeta?.color
    ? toSafeHexColor(selectedProjectMeta.color)
    : null

  return (
    <section className="flex flex-col gap-4">
      <div className="overflow-hidden min-h-[80svh] flex flex-col justify-between">
        <div className="flex items-center justify-center py-6 min-h-60 flex-1">
          <TimerDisplay />
        </div>

        <div className="min-h-[132px]">
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
                  <input
                    type="text"
                    aria-label="Running entry description"
                    placeholder="Untitled session"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    onBlur={handleDescriptionCommit}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        event.currentTarget.blur()
                      } else if (event.key === 'Escape') {
                        skipDescriptionCommitRef.current = true
                        setDescription(activeEntry?.description ?? '')
                        event.currentTarget.blur()
                      }
                    }}
                    disabled={runningDisabled}
                    className="w-full rounded-md border-0 bg-transparent px-1 text-base text-foreground placeholder:text-muted-foreground/50 focus-visible:bg-secondary/50 focus-visible:outline-none disabled:opacity-70"
                  />
                  <Select
                    value={selectedProject}
                    onValueChange={handleRunningProjectChange}
                    disabled={runningDisabled || isLoadingProjects}
                  >
                    <SelectTrigger
                      aria-label="Running entry project"
                      className="h-6 w-auto gap-1 border-0 bg-transparent p-0 text-sm text-muted-foreground shadow-none focus:ring-0 focus-visible:outline-none [&>span]:line-clamp-1"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={cn(
                            'h-2.5 w-2.5 rounded-full',
                            !runningProjectColor && 'border border-border bg-transparent'
                          )}
                          style={
                            runningProjectColor
                              ? { backgroundColor: runningProjectColor }
                              : undefined
                          }
                        />
                        <SelectValue placeholder="No project" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PROJECT_VALUE}>No project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid h-auto w-[120px] min-w-[120px] shrink-0 place-items-center p-1">
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-full w-full min-w-full rounded-xl px-4 [&_svg]:size-6"
                    onClick={handleStop}
                    disabled={isSubmitting || isEntriesLoading}
                    aria-label="Stop timer"
                    aria-keyshortcuts="Meta+Shift+S Control+Shift+S"
                  >
                    {isSubmitting ? (
                      <LoaderCircle className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Square className="fill-current" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="idle"
                onSubmit={(event) => {
                  event.preventDefault()
                  handleStart()
                }}
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
                    type="submit"
                    variant="default"
                    className="h-full w-full min-w-full rounded-xl px-4 [&_svg]:size-6"
                    disabled={isSubmitting || isEntriesLoading}
                    aria-label="Start timer"
                    aria-keyshortcuts="Meta+Shift+S Control+Shift+S"
                  >
                    {isSubmitting ? (
                      <LoaderCircle className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Play className="fill-current" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </motion.form>
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
