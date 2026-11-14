import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PreferencesSheet from '../PreferencesSheet'
import type { useTimerNotification } from '@/hooks/useTimerNotification'

vi.mock('@/components/settings/GoogleCalendarSection', () => ({
  default: () => <div>Google Calendar</div>,
}))

const notification = {
  permissionState: 'unsupported',
  thresholdMinutes: 0,
  setThreshold: vi.fn(),
} as unknown as ReturnType<typeof useTimerNotification>

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

function renderSheet(onClose = vi.fn()) {
  return render(
    <PreferencesSheet
      open
      onClose={onClose}
      userEmail="me@example.com"
      onSignOut={vi.fn()}
      isSigningOut={false}
      notification={notification}
    />
  )
}

describe('PreferencesSheet', () => {
  beforeEach(() => {
    stubMatchMedia()
    window.localStorage.clear()
  })

  it('renders a dialog titled Preferences with every section', () => {
    renderSheet()

    expect(screen.getByRole('dialog', { name: 'Preferences' })).toBeTruthy()
    expect(screen.getByText('Google Calendar')).toBeTruthy()
    expect(screen.getByText('Keyboard shortcuts')).toBeTruthy()
    expect(screen.getByText('me@example.com')).toBeTruthy()
  })

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn()
    renderSheet(onClose)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('does not render while closed', () => {
    render(
      <PreferencesSheet
        open={false}
        onClose={vi.fn()}
        userEmail="me@example.com"
        onSignOut={vi.fn()}
        isSigningOut={false}
        notification={notification}
      />
    )

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
