import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDuration } from '@/lib/utils'

const THRESHOLD_KEY = 'tinytime:notify-threshold'

function readStoredThreshold(): number {
  if (typeof window === 'undefined') {
    return 0
  }

  const raw = window.localStorage.getItem(THRESHOLD_KEY)
  if (raw === null) {
    return 0
  }

  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function writeStoredThreshold(minutes: number): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(THRESHOLD_KEY, String(minutes))
}

function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') {
    return 'unsupported'
  }

  return Notification.permission
}

export interface UseTimerNotificationResult {
  thresholdMinutes: number
  setThreshold: (minutes: number) => void
  permissionState: NotificationPermission | 'unsupported'
}

interface UseTimerNotificationParams {
  elapsedSeconds: number
  isRunning: boolean
}

export function useTimerNotification({
  elapsedSeconds,
  isRunning,
}: UseTimerNotificationParams): UseTimerNotificationResult {
  const [thresholdMinutes, setThresholdMinutes] = useState<number>(readStoredThreshold)
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(
    getNotificationPermission()
  )
  const firedRef = useRef(false)

  // Reset fired state when the timer stops
  useEffect(() => {
    if (!isRunning) {
      firedRef.current = false
    }
  }, [isRunning])

  // Reset fired state when the threshold changes
  useEffect(() => {
    firedRef.current = false
  }, [thresholdMinutes])

  // Fire notification when elapsed time crosses the threshold
  useEffect(() => {
    if (!isRunning) {
      return
    }

    if (thresholdMinutes <= 0) {
      return
    }

    if (firedRef.current) {
      return
    }

    if (permissionState !== 'granted') {
      return
    }

    const thresholdSeconds = thresholdMinutes * 60
    if (elapsedSeconds >= thresholdSeconds) {
      firedRef.current = true
      new Notification('tinytime', {
        body: `You've been tracking for ${formatDuration(elapsedSeconds)}.`,
        icon: '/favicon.svg',
      })
    }
  }, [isRunning, elapsedSeconds, thresholdMinutes, permissionState])

  const setThreshold = useCallback(
    async (minutes: number) => {
      const clamped = Math.max(0, Math.round(minutes))
      setThresholdMinutes(clamped)
      writeStoredThreshold(clamped)
      firedRef.current = false

      if (
        clamped > 0 &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'default'
      ) {
        const result = await Notification.requestPermission()
        setPermissionState(result)
      } else {
        setPermissionState(getNotificationPermission())
      }
    },
    []
  )

  return {
    thresholdMinutes,
    setThreshold,
    permissionState,
  }
}
