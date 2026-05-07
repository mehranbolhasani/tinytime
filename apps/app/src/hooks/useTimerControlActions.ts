import { useCallback, useState } from 'react'
import { useTimerContext } from '@/contexts/TimerContext'
import type { TimeEntry } from '@/types'

interface StartTimerInput {
  projectId?: string | null
  description?: string
}

interface UseTimerControlActionsParams {
  createEntry: (input: { project_id: string | null; description: string; started_at: string }) => Promise<TimeEntry>
  stopEntry: (id: string, stopped_at: string) => Promise<TimeEntry>
}

interface UseTimerControlActionsResult {
  isSubmitting: boolean
  error: string
  clearError: () => void
  startTimer: (input?: StartTimerInput) => Promise<void>
  stopTimer: () => Promise<void>
  toggleTimer: (input?: StartTimerInput) => Promise<void>
}

export function useTimerControlActions({
  createEntry,
  stopEntry,
}: UseTimerControlActionsParams): UseTimerControlActionsResult {
  const timer = useTimerContext()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const clearError = useCallback(() => {
    setError('')
  }, [])

  const stopTimer = useCallback(async () => {
    const activeEntry = timer.activeEntry
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
  }, [stopEntry, timer])

  const startTimer = useCallback(async (input: StartTimerInput = {}) => {
    setIsSubmitting(true)
    setError('')

    try {
      if (timer.activeEntry) {
        const forcedStoppedAt = new Date().toISOString()
        await stopEntry(timer.activeEntry.id, forcedStoppedAt)
        timer.reset()
      }

      const created = await createEntry({
        project_id: input.projectId ?? null,
        description: input.description ?? '',
        started_at: new Date().toISOString(),
      })
      timer.start(created)
    } catch (startError) {
      setError((startError as Error)?.message ?? 'Unable to start timer.')
    } finally {
      setIsSubmitting(false)
    }
  }, [createEntry, stopEntry, timer])

  const toggleTimer = useCallback(async (input: StartTimerInput = {}) => {
    if (timer.activeEntry && timer.isRunning) {
      await stopTimer()
      return
    }

    await startTimer(input)
  }, [startTimer, stopTimer, timer.activeEntry, timer.isRunning])

  return {
    isSubmitting,
    error,
    clearError,
    startTimer,
    stopTimer,
    toggleTimer,
  }
}
