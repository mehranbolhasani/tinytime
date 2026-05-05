/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useActiveTimeEntry } from '@/hooks/useTimeEntries'
import { useTimer, type UseTimerResult } from '@/hooks/useTimer'
import type { TimeEntry } from '@/types'

interface TimerContextValue extends UseTimerResult {
  activeEntry: TimeEntry | null
  isLoading: boolean
}

const TimerContext = createContext<TimerContextValue | null>(null)

export function TimerProvider({ children }: { children: ReactNode }) {
  const { activeEntry, isLoading } = useActiveTimeEntry()
  const timer = useTimer(activeEntry)

  const value = useMemo(
    () => ({
      activeEntry,
      isLoading,
      ...timer,
    }),
    [activeEntry, isLoading, timer]
  )

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}

export function useTimerContext(): TimerContextValue {
  const context = useContext(TimerContext)
  if (!context) {
    throw new Error('useTimerContext must be used inside TimerProvider.')
  }

  return context
}
