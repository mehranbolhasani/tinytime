import { useCallback, useEffect, useState } from 'react'
import { useTimerContext } from '@/contexts/TimerContext'
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

function showTimerNotification(body: string): boolean {
  try {
    new Notification('tinytime', { body, icon: '/favicon.svg' })
    return true
  } catch {
    return false
  }
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

export function useTimerNotification(): UseTimerNotificationResult {
  const { activeEntry } = useTimerContext()
  const [thresholdMinutes, setThresholdMinutes] = useState<number>(readStoredThreshold)
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(
    getNotificationPermission()
  )
  const entryId = activeEntry?.id ?? null
  const startedAt = activeEntry?.started_at ?? null

  useEffect(() => {
    if (!entryId || !startedAt || thresholdMinutes <= 0 || permissionState !== 'granted') return
    const startedMs = Date.parse(startedAt)
    if (Number.isNaN(startedMs)) return
    const delay = startedMs + thresholdMinutes * 60_000 - Date.now()
    // Threshold passed more than a minute ago (e.g. page reload): don't nag again.
    if (delay < -60_000) return
    const id = window.setTimeout(() => {
      const shown = showTimerNotification(`You've been tracking for ${formatDuration(thresholdMinutes * 60)}.`)
      if (!shown) setPermissionState('unsupported')
    }, Math.max(0, delay))
    return () => window.clearTimeout(id)
  }, [entryId, startedAt, thresholdMinutes, permissionState])

  const setThreshold = useCallback(
    async (minutes: number) => {
      const clamped = Math.max(0, Math.round(minutes))
      setThresholdMinutes(clamped)
      writeStoredThreshold(clamped)

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
