/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useActiveTimeEntry } from '@/hooks/useTimeEntries'
import type { TimeEntry } from '@/types'

interface TimerContextValue {
  activeEntry: TimeEntry | null
  isRunning: boolean
  isLoading: boolean
}

const TimerContext = createContext<TimerContextValue | null>(null)

export function TimerProvider({ children }: { children: ReactNode }) {
  const { activeEntry, isLoading } = useActiveTimeEntry()

  const value = useMemo(
    () => ({
      activeEntry,
      isRunning: activeEntry !== null,
      isLoading,
    }),
    [activeEntry, isLoading]
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
