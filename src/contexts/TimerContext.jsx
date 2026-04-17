/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo } from 'react'
import { useActiveTimeEntry } from '@/hooks/useTimeEntries'
import { useTimer } from '@/hooks/useTimer'

const TimerContext = createContext(null)

export function TimerProvider({ children }) {
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

export function useTimerContext() {
  const context = useContext(TimerContext)
  if (!context) {
    throw new Error('useTimerContext must be used inside TimerProvider.')
  }

  return context
}
