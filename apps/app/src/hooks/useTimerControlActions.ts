import { useCallback, useState, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ACTIVE_ENTRY_QUERY_KEY, useTimeEntryMutations } from '@/hooks/useTimeEntries'
import { isOptimisticEntry } from '@/lib/timer'
import {
  isTimerActionPending,
  runTimerAction,
  subscribeTimerAction,
  trackRunningEntryEdit,
  waitForRunningEntryEdits,
} from '@/lib/timerActionLock'
import type { Project, TimeEntry } from '@/types'

interface StartTimerInput {
  projectId?: string | null
  description?: string
}

interface StopTimerOptions {
  /** Defaults to now. Used by idle detection to stop at the moment the user left. */
  stoppedAt?: string
}

interface UpdateRunningEntryInput {
  description?: string
  projectId?: string | null
}

interface UseTimerControlActionsResult {
  isSubmitting: boolean
  error: string
  clearError: () => void
  startTimer: (input?: StartTimerInput) => Promise<void>
  stopTimer: (options?: StopTimerOptions) => Promise<void>
  toggleTimer: (input?: StartTimerInput) => Promise<void>
  updateRunningEntry: (updates: UpdateRunningEntryInput) => Promise<void>
}

interface UseTimerControlActionsOptions {
  reportErrors?: 'inline' | 'toast'
}

export function useTimerControlActions({
  reportErrors = 'inline',
}: UseTimerControlActionsOptions = {}): UseTimerControlActionsResult {
  const queryClient = useQueryClient()
  const { createEntry, stopEntry, updateEntry } = useTimeEntryMutations()
  const isSubmitting = useSyncExternalStore(subscribeTimerAction, isTimerActionPending, () => false)
  const [error, setError] = useState('')

  const clearError = useCallback(() => {
    setError('')
  }, [])

  const reportError = useCallback(
    (message: string) => {
      if (reportErrors === 'toast') {
        toast.error(message)
        return
      }
      setError(message)
    },
    [reportErrors]
  )

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

      // Let in-flight edits land first; keep the stop time captured above.
      await waitForRunningEntryEdits()

      try {
        await stopEntry(current.id, stoppedAt, current.started_at)
      } catch (stopError) {
        queryClient.setQueryData(ACTIVE_ENTRY_QUERY_KEY, current)
        reportError((stopError as Error)?.message ?? 'Unable to stop timer.')
      }
    })
  }, [queryClient, reportError, stopEntry])

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
        reportError((startError as Error)?.message ?? 'Unable to start timer.')
      }
    })
  }, [createEntry, queryClient, reportError, stopEntry])

  const toggleTimer = useCallback(async (input: StartTimerInput = {}) => {
    const current = queryClient.getQueryData<TimeEntry | null>(ACTIVE_ENTRY_QUERY_KEY) ?? null
    if (current) {
      await stopTimer()
      return
    }

    await startTimer(input)
  }, [queryClient, startTimer, stopTimer])

  const updateRunningEntry = useCallback(
    async (updates: UpdateRunningEntryInput) => {
      const current = queryClient.getQueryData<TimeEntry | null>(ACTIVE_ENTRY_QUERY_KEY) ?? null
      if (!current || isOptimisticEntry(current) || isTimerActionPending()) {
        return
      }

      const payload: { description?: string; project_id?: string | null } = {}
      if (updates.description !== undefined) {
        payload.description = updates.description
      }
      if (updates.projectId !== undefined) {
        payload.project_id = updates.projectId
      }

      if (Object.keys(payload).length === 0) {
        return
      }

      const promise = updateEntry(current.id, payload)
      trackRunningEntryEdit(promise)

      try {
        await promise
      } catch (updateError) {
        reportError((updateError as Error)?.message ?? 'Unable to update this entry.')
      }
    },
    [queryClient, reportError, updateEntry]
  )

  return {
    isSubmitting,
    error,
    clearError,
    startTimer,
    stopTimer,
    toggleTimer,
    updateRunningEntry,
  }
}
