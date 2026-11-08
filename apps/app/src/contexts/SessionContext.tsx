/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react'

const SessionUserIdContext = createContext<string | null>(null)

export function SessionUserProvider({ userId, children }: { userId: string; children: ReactNode }) {
  return <SessionUserIdContext.Provider value={userId}>{children}</SessionUserIdContext.Provider>
}

export function useCurrentUserId(): string {
  const userId = useContext(SessionUserIdContext)
  if (!userId) {
    throw new Error('useCurrentUserId must be used inside SessionUserProvider.')
  }

  return userId
}
