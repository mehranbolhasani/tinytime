import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, Play, Square } from 'lucide-react'
import ProjectSelect from '@/components/projects/ProjectSelect'
import { Button } from '@/components/ui/button'
import TimerDisplay from '@/components/timer/TimerDisplay'
import { useProjects } from '@/hooks/useProjects'
import { useTimerControlActions } from '@/hooks/useTimerControlActions'
import { useTimerContext } from '@/contexts/TimerContext'
import { isOptimisticEntry } from '@/lib/timer'

interface TimerWidgetProps {
  isEntriesLoading?: boolean
}

export default function TimerWidget({ isEntriesLoading = false }: TimerWidgetProps) {
  const { projects, isLoading: isLoadingProjects } = useProjects()
  const timer = useTimerContext()
  const activeEntry = timer.activeEntry
  const [description, setDescription] = useState(activeEntry?.description ?? '')
  const [selectedProject, setSelectedProject] = useState(activeEntry?.project_id ?? null)
  const { isSubmitting, error, startTimer, stopTimer, updateRunningEntry } = useTimerControlActions()
  const skipDescriptionCommitRef = useRef(false)
  const activeEntryRef = useRef(activeEntry)
  const syncKey = activeEntry
    ? `${activeEntry.id}|${activeEntry.description ?? ''}|${activeEntry.project_id ?? ''}`
    : 'idle'
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey)

  useEffect(() => {
    activeEntryRef.current = activeEntry
  }, [activeEntry])

  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey)
    setDescription(activeEntry?.description ?? '')
    setSelectedProject(activeEntry?.project_id ?? null)
  }

  const isOptimistic = activeEntry ? isOptimisticEntry(activeEntry) : false
  const runningDisabled = isSubmitting || isEntriesLoading || isOptimistic

  const handleStart = () => {
    if (isSubmitting || isEntriesLoading) {
      return
    }

    void startTimer({
      projectId: selectedProject,
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

    void updateRunningEntry({ description: nextDescription }).then((saved) => {
      if (!saved) {
        setDescription(activeEntryRef.current?.description ?? '')
      }
    })
  }

  const handleRunningProjectChange = (projectId: string | null) => {
    setSelectedProject(projectId)

    if (!activeEntry || runningDisabled) {
      return
    }

    if (projectId === (activeEntry.project_id ?? null)) {
      return
    }

    void updateRunningEntry({ projectId }).then((saved) => {
      if (!saved) {
        setSelectedProject(activeEntryRef.current?.project_id ?? null)
      }
    })
  }

  return (
    <section className="flex-1 h-screen">
      <div className="overflow-hidden flex flex-col justify-between h-full p-12 items-center">
        <div className="flex items-center justify-center py-6 min-h-60 flex-1">
          <TimerDisplay />
        </div>

        <div className="min-h-auto max-w-4xl w-xl">
          {timer.isRunning ? (
            <div className="flex items-stretch">
              <div className="flex min-w-0 flex-1 justify-center gap-2 px-4 py-3">
                <input
                  type="text"
                  id="description"
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
                <ProjectSelect
                  value={selectedProject}
                  onChange={handleRunningProjectChange}
                  projects={projects}
                  disabled={runningDisabled || isLoadingProjects}
                  aria-label="Running entry project"
                  triggerClassName="h-6 w-auto gap-1 rounded-md bg-transparent p-0 text-sm text-muted-foreground ring-0 shadow-none focus:ring-0 focus-visible:bg-tint focus-visible:outline-none focus-visible:ring-0 [&>span]:line-clamp-1"
                />
              </div>
              <div className="grid h-auto w-auto shrink-0 place-items-center p-1">
                <Button
                  type="button"
                  variant="destructive"
                  className="h-full w-full min-w-full rounded-xl px-4 [&_svg]:size-4"
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
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                handleStart()
              }}
              className="flex items-center bg-card p-1 rounded-xl"
            >
              <div className="flex flex-1 items-center">
                <div className="w-full">
                  <input
                    type="text"
                    id="description"
                    aria-label="Work description"
                    placeholder="Describe your work"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={isSubmitting || isEntriesLoading}
                    className="h-12 w-full px-4 text-base text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none"
                  />
                </div>
                <div className="flex h-12 w-full min-w-0 items-stretch">
                  <ProjectSelect
                    value={selectedProject}
                    onChange={setSelectedProject}
                    projects={projects}
                    disabled={isLoadingProjects || isSubmitting || isEntriesLoading}
                    triggerClassName="h-full w-full rounded-none bg-card ring-0 shadow-none focus:ring-0 focus-visible:bg-tint focus-visible:outline-none focus-visible:ring-0 data-[state=open]:ring-0"
                  />
                </div>
              </div>
              <div className="grid h-12 w-12 w-auto shrink-0 place-items-center p-1">
                <Button
                  type="submit"
                  variant="default"
                  className="h-full w-full min-w-full rounded-md px-3 [&_svg]:size-4"
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
            </form>
          )}
        </div>
      </div>

      {isEntriesLoading ? (
        <p className="text-xs text-muted-foreground/80">Loading your current timer state...</p>
      ) : null}

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </section>
  )
}
