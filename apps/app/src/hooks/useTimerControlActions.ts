import { useCallback, useState, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ACTIVE_ENTRY_QUERY_KEY, useTimeEntryMutations } from '@/hooks/useTimeEntries'
import { isOptimisticEntry } from '@/lib/timer'
import { isTimerActionPending, runTimerAction, subscribeTimerAction } from '@/lib/timerActionLock'
import type { Project, TimeEntry } from '@/types'

interface StartTimerInput {
  projectId?: string | null
  description?: string
}

interface StopTimerOptions {
  /** Defaults to now. Used by idle detection to stop at the moment the user left. */
  stoppedAt?: string
}

interface UseTimerControlActionsResult {
  isSubmitting: boolean
  error: string
  clearError: () => void
  startTimer: (input?: StartTimerInput) => Promise<void>
  stopTimer: (options?: StopTimerOptions) => Promise<void>
  toggleTimer: (input?: StartTimerInput) => Promise<void>
}

export function useTimerControlActions(): UseTimerControlActionsResult {
  const queryClient = useQueryClient()
  const { createEntry, stopEntry } = useTimeEntryMutations()
  const isSubmitting = useSyncExternalStore(subscribeTimerAction, isTimerActionPending, () => false)
  const [error, setError] = useState('')

  const clearError = useCallback(() => {
    setError('')
  }, [])

  const stopTimer = useCallback(async (options: StopTimerOptions = {}) => {
    return runTimerAction(async () => {
      const current = queryClient.getQueryData<TimeEntry | null>(ACTIVE_ENTRY_QUERY_KEY) ?? null
      if (!current || isOptimisticEntry(current)) {
        return
      }

      const stoppedAt = options.stoppedAt ?? new Date().toISOString()
      await queryClient.cancelQueries({ queryKey: ACTIVE_ENTRY_QUERY_KEY })
      queryClient.setQueryData(ACTIVE_ENTRY_QUERY_KEY, null)
      setError('')

      try {
        await stopEntry(current.id, stoppedAt, current.started_at)
      } catch (stopError) {
        queryClient.setQueryData(ACTIVE_ENTRY_QUERY_KEY, current)
        setError((stopError as Error)?.message ?? 'Unable to stop timer.')
      }
    })
  }, [queryClient, stopEntry])

  const startTimer = useCallback(async (input: StartTimerInput = {}) => {
    return runTimerAction(async () => {
      const previous = queryClient.getQueryData<TimeEntry | null>(ACTIVE_ENTRY_QUERY_KEY) ?? null
      const startedAt = new Date().toISOString()
      const projectId = input.projectId ?? null
      const project = projectId
        ? queryClient.getQueryData<Project[]>(['projects'])?.find((p) => p.id === projectId) ?? null
        : null
      const description = input.description?.trim() ? input.description.trim() : null

      const optimistic: TimeEntry = {
        id: `optimistic-${crypto.randomUUID()}`,
        started_at: startedAt,
        stopped_at: null,
        duration_seconds: null,
        description,
        project_id: projectId,
        projects: project ? { id: project.id, name: project.name, color: project.color } : null,
      }

      await queryClient.cancelQueries({ queryKey: ACTIVE_ENTRY_QUERY_KEY })
      queryClient.setQueryData(ACTIVE_ENTRY_QUERY_KEY, optimistic)
      setError('')

      try {
        if (previous) {
          await stopEntry(previous.id, startedAt, previous.started_at)
        }
        await createEntry({ project_id: projectId, description: description ?? '', started_at: startedAt })
        // createEntry's onSuccess replaces the optimistic entry with the real row (Task 3a).
      } catch (startError) {
        queryClient.setQueryData(ACTIVE_ENTRY_QUERY_KEY, previous)
        queryClient.invalidateQueries({ queryKey: ACTIVE_ENTRY_QUERY_KEY })
        setError((startError as Error)?.message ?? 'Unable to start timer.')
      }
    })
  }, [createEntry, queryClient, stopEntry])

  const toggleTimer = useCallback(async (input: StartTimerInput = {}) => {
    const current = queryClient.getQueryData<TimeEntry | null>(ACTIVE_ENTRY_QUERY_KEY) ?? null
    if (current) {
      await stopTimer()
      return
    }

    await startTimer(input)
  }, [queryClient, startTimer, stopTimer])

  return {
    isSubmitting,
    error,
    clearError,
    startTimer,
    stopTimer,
    toggleTimer,
  }
}
