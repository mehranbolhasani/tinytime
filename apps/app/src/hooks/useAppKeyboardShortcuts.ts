import { useEffect, useRef } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import {
  CALENDAR_SHORTCUT_EVENT,
  createKeyboardShortcutState,
  isBlockingOverlayOpen,
  isEditableKeyboardTarget,
  resolveKeyboardShortcut,
  type KeyboardShortcutState,
} from '@/lib/keyboardShortcuts'

interface UseAppKeyboardShortcutsParams {
  pathname: string
  navigate: NavigateFunction
  onToggleTimer: () => Promise<void>
}

export function useAppKeyboardShortcuts({
  pathname,
  navigate,
  onToggleTimer,
}: UseAppKeyboardShortcutsParams): void {
  const stateRef = useRef<KeyboardShortcutState>(createKeyboardShortcutState())

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableKeyboardTarget(event.target) || isBlockingOverlayOpen()) {
        return
      }

      const result = resolveKeyboardShortcut({
        state: stateRef.current,
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        repeat: event.repeat,
        nowMs: Date.now(),
        pathname,
      })

      stateRef.current = result.nextState

      if (!result.action) {
        return
      }

      if (result.shouldPreventDefault) {
        event.preventDefault()
      }

      if (result.action.type === 'navigate') {
        if (pathname !== result.action.to) {
          navigate(result.action.to)
        }
        return
      }

      if (result.action.type === 'toggle-timer') {
        void onToggleTimer()
        return
      }

      window.dispatchEvent(
        new CustomEvent(CALENDAR_SHORTCUT_EVENT, {
          detail: { direction: result.action.direction },
        })
      )
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [navigate, onToggleTimer, pathname])
}
