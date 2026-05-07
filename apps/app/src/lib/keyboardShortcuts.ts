export const GO_TO_SHORTCUT_TIMEOUT_MS = 1000
export const CALENDAR_SHORTCUT_EVENT = 'tinytime:calendar-nav'

export const GO_TO_ROUTE_BY_KEY = {
  t: '/',
  c: '/calendar',
  r: '/reports',
  p: '/projects',
} as const

type GoToRouteKey = keyof typeof GO_TO_ROUTE_BY_KEY
export type AppRoute = (typeof GO_TO_ROUTE_BY_KEY)[GoToRouteKey]
export type CalendarShortcutDirection = 'previous' | 'next'

export interface KeyboardShortcutState {
  goPrefixAt: number | null
}

export interface KeyboardShortcutInput {
  state: KeyboardShortcutState
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  repeat: boolean
  nowMs: number
  pathname: string
}

type KeyboardShortcutAction =
  | { type: 'navigate'; to: AppRoute }
  | { type: 'toggle-timer' }
  | { type: 'calendar-nav'; direction: CalendarShortcutDirection }

export interface KeyboardShortcutResolution {
  action: KeyboardShortcutAction | null
  nextState: KeyboardShortcutState
  shouldPreventDefault: boolean
}

export function createKeyboardShortcutState(): KeyboardShortcutState {
  return { goPrefixAt: null }
}

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false
  }

  return Boolean(
    target.closest(
      [
        'input',
        'textarea',
        'select',
        '[contenteditable]:not([contenteditable="false"])',
        '[role="textbox"]',
        '[role="combobox"]',
      ].join(',')
    )
  )
}

export function isBlockingOverlayOpen(documentRef: Document = document): boolean {
  return Boolean(
    documentRef.querySelector(
      [
        '[role="dialog"][data-state="open"]',
        '[role="listbox"][data-state="open"]',
        '[data-state="open"][data-side]',
      ].join(',')
    )
  )
}

function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key
}

function hasModKey(metaKey: boolean, ctrlKey: boolean): boolean {
  return metaKey || ctrlKey
}

function getRouteForGoToKey(key: string): AppRoute | null {
  if (key in GO_TO_ROUTE_BY_KEY) {
    return GO_TO_ROUTE_BY_KEY[key as GoToRouteKey]
  }

  return null
}

export function resolveKeyboardShortcut(input: KeyboardShortcutInput): KeyboardShortcutResolution {
  const normalizedKey = normalizeKey(input.key)
  let nextState = input.state
  const goShortcutIsExpired =
    input.state.goPrefixAt !== null &&
    input.nowMs - input.state.goPrefixAt > GO_TO_SHORTCUT_TIMEOUT_MS

  if (goShortcutIsExpired) {
    nextState = createKeyboardShortcutState()
  }

  if (input.repeat) {
    return { action: null, nextState, shouldPreventDefault: false }
  }

  const modKey = hasModKey(input.metaKey, input.ctrlKey)
  const noModifiers = !input.metaKey && !input.ctrlKey && !input.altKey && !input.shiftKey
  const waitingForGoToTarget = nextState.goPrefixAt !== null

  if (waitingForGoToTarget && noModifiers) {
    const route = getRouteForGoToKey(normalizedKey)
    if (route) {
      return {
        action: { type: 'navigate', to: route },
        nextState: createKeyboardShortcutState(),
        shouldPreventDefault: true,
      }
    }
  }

  if (noModifiers && normalizedKey === 'g') {
    return {
      action: null,
      nextState: { goPrefixAt: input.nowMs },
      shouldPreventDefault: false,
    }
  }

  if (modKey && input.shiftKey && !input.altKey && normalizedKey === 's') {
    return {
      action: { type: 'toggle-timer' },
      nextState: createKeyboardShortcutState(),
      shouldPreventDefault: true,
    }
  }

  if (!modKey && input.altKey && !input.shiftKey && input.pathname === '/calendar') {
    if (normalizedKey === 'ArrowLeft') {
      return {
        action: { type: 'calendar-nav', direction: 'previous' },
        nextState: createKeyboardShortcutState(),
        shouldPreventDefault: true,
      }
    }

    if (normalizedKey === 'ArrowRight') {
      return {
        action: { type: 'calendar-nav', direction: 'next' },
        nextState: createKeyboardShortcutState(),
        shouldPreventDefault: true,
      }
    }
  }

  return {
    action: null,
    nextState: waitingForGoToTarget ? createKeyboardShortcutState() : nextState,
    shouldPreventDefault: false,
  }
}
