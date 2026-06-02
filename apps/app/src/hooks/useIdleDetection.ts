import { useEffect, useRef } from 'react'

interface UseIdleDetectionOptions {
  isRunning: boolean
  thresholdMinutes?: number
  onIdleReturn: (idleSeconds: number, hiddenAt: Date) => void
}

export function useIdleDetection({
  isRunning,
  thresholdMinutes = 5,
  onIdleReturn,
}: UseIdleDetectionOptions): void {
  const hiddenAtRef = useRef<Date | null>(null)
  const onIdleReturnRef = useRef<typeof onIdleReturn>(onIdleReturn)
  onIdleReturnRef.current = onIdleReturn

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isRunning) {
          hiddenAtRef.current = new Date()
        }
      } else {
        const hiddenAt = hiddenAtRef.current
        hiddenAtRef.current = null
        if (hiddenAt && isRunning) {
          const idleSeconds = Math.round((Date.now() - hiddenAt.getTime()) / 1000)
          if (idleSeconds >= thresholdMinutes * 60) {
            onIdleReturnRef.current(idleSeconds, hiddenAt)
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isRunning, thresholdMinutes])
}
