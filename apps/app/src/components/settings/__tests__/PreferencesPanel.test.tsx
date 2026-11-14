import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PreferencesPanel from '../PreferencesPanel'
import type { useTimerNotification } from '@/hooks/useTimerNotification'

vi.mock('@/components/settings/GoogleCalendarSection', () => ({
  default: () => <div>Google Calendar</div>,
}))

function stubMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
}

const notification = {
  permissionState: 'unsupported',
  thresholdMinutes: 0,
  setThreshold: vi.fn(),
} as unknown as ReturnType<typeof useTimerNotification>

function renderPanel(open: boolean, onClose = vi.fn()) {
  const view = render(
    <PreferencesPanel
      open={open}
      onClose={onClose}
      userEmail="me@example.com"
      onSignOut={vi.fn()}
      isSigningOut={false}
      notification={notification}
    />
  )

  return { ...view, onClose }
}

describe('PreferencesPanel', () => {
  beforeEach(() => {
    stubMatchMedia()
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('starts closed, inert and without section content', () => {
    renderPanel(false)

    const region = screen.getByRole('region', { name: 'Preferences' })
    expect(region).toHaveAttribute('inert')
    expect(screen.queryByText('Keyboard shortcuts')).toBeNull()
  })

  it('focuses the heading and renders every section when open', async () => {
    renderPanel(true)

    expect(screen.queryByText('Keyboard shortcuts')).not.toBeNull()
    expect(screen.getByText('Google Calendar')).toBeTruthy()

    const heading = screen.getByRole('heading', { name: 'Preferences' })
    await waitFor(() => expect(heading).toHaveFocus())
  })

  it('closes on Escape', () => {
    const { onClose } = renderPanel(true)

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('leaves Escape alone when a layer already handled it', () => {
    const { onClose } = renderPanel(true)
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    event.preventDefault()

    act(() => {
      document.dispatchEvent(event)
    })

    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps the sections mounted after closing', () => {
    const { rerender } = renderPanel(false)

    expect(screen.queryByText('Keyboard shortcuts')).toBeNull()

    rerender(
      <PreferencesPanel
        open
        onClose={vi.fn()}
        userEmail="me@example.com"
        onSignOut={vi.fn()}
        isSigningOut={false}
        notification={notification}
      />
    )
    expect(screen.queryByText('Keyboard shortcuts')).not.toBeNull()

    rerender(
      <PreferencesPanel
        open={false}
        onClose={vi.fn()}
        userEmail="me@example.com"
        onSignOut={vi.fn()}
        isSigningOut={false}
        notification={notification}
      />
    )

    expect(screen.queryByText('Keyboard shortcuts')).not.toBeNull()
    expect(screen.getByRole('region', { name: 'Preferences' })).toHaveAttribute('inert')
  })
})
