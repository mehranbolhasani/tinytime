import { describe, expect, it } from 'vitest'
import {
  createKeyboardShortcutState,
  GO_TO_SHORTCUT_TIMEOUT_MS,
  isBlockingOverlayOpen,
  isEditableKeyboardTarget,
  resolveKeyboardShortcut,
} from '../keyboardShortcuts.js'

describe('isEditableKeyboardTarget', () => {
  it('returns true for input-like controls', () => {
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')

    expect(isEditableKeyboardTarget(input)).toBe(true)
    expect(isEditableKeyboardTarget(textarea)).toBe(true)
    expect(isEditableKeyboardTarget(select)).toBe(true)
  })

  it('returns true for contenteditable and combobox descendants', () => {
    const contentEditable = document.createElement('div')
    contentEditable.setAttribute('contenteditable', 'true')

    const child = document.createElement('span')
    contentEditable.appendChild(child)

    const combobox = document.createElement('button')
    combobox.setAttribute('role', 'combobox')

    expect(isEditableKeyboardTarget(child)).toBe(true)
    expect(isEditableKeyboardTarget(combobox)).toBe(true)
  })

  it('returns false for non-editable controls', () => {
    const button = document.createElement('button')
    expect(isEditableKeyboardTarget(button)).toBe(false)
  })
})

describe('isBlockingOverlayOpen', () => {
  it('returns true when an open dialog exists', () => {
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('data-state', 'open')
    document.body.appendChild(dialog)

    expect(isBlockingOverlayOpen()).toBe(true)
    dialog.remove()
  })

  it('returns false when no supported overlay is open', () => {
    expect(isBlockingOverlayOpen()).toBe(false)
  })
})

describe('resolveKeyboardShortcut', () => {
  const createInput = (overrides = {}) => ({
    state: createKeyboardShortcutState(),
    key: '',
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    nowMs: 10_000,
    pathname: '/',
    ...overrides,
  })

  it('starts a go-to sequence on "g"', () => {
    const result = resolveKeyboardShortcut(createInput({ key: 'g' }))
    expect(result.action).toBeNull()
    expect(result.nextState.goPrefixAt).toBe(10_000)
  })

  it('navigates when a matching key follows "g"', () => {
    const state = { goPrefixAt: 10_000 }
    const result = resolveKeyboardShortcut(createInput({ state, key: 't', nowMs: 10_100 }))

    expect(result.action).toEqual({ type: 'navigate', to: '/' })
    expect(result.shouldPreventDefault).toBe(true)
    expect(result.nextState.goPrefixAt).toBeNull()
  })

  it('clears an expired go-to sequence', () => {
    const state = { goPrefixAt: 10_000 }
    const result = resolveKeyboardShortcut(
      createInput({
        state,
        key: 't',
        nowMs: 10_000 + GO_TO_SHORTCUT_TIMEOUT_MS + 1,
      })
    )

    expect(result.action).toBeNull()
    expect(result.nextState.goPrefixAt).toBeNull()
  })

  it('matches timer toggle with Mod+Shift+S', () => {
    const result = resolveKeyboardShortcut(
      createInput({
        key: 's',
        metaKey: true,
        shiftKey: true,
      })
    )

    expect(result.action).toEqual({ type: 'toggle-timer' })
    expect(result.shouldPreventDefault).toBe(true)
  })

  it('matches calendar navigation only on calendar route', () => {
    const inCalendar = resolveKeyboardShortcut(
      createInput({
        pathname: '/calendar',
        key: 'ArrowLeft',
        altKey: true,
      })
    )
    expect(inCalendar.action).toEqual({ type: 'calendar-nav', direction: 'previous' })

    const outsideCalendar = resolveKeyboardShortcut(
      createInput({
        pathname: '/',
        key: 'ArrowLeft',
        altKey: true,
      })
    )
    expect(outsideCalendar.action).toBeNull()
  })
})
