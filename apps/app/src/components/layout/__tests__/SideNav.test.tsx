import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SideNav from '../SideNav'
import type { useTimerNotification } from '@/hooks/useTimerNotification'

const timerState = vi.hoisted(() => ({
  isRunning: false,
  activeEntry: null as { started_at: string } | null,
}))

vi.mock('@/contexts/TimerContext', () => ({
  useTimerContext: () => ({
    isRunning: timerState.isRunning,
    activeEntry: timerState.activeEntry,
  }),
}))

const notification = {
  permissionState: 'unsupported',
  thresholdMinutes: 0,
  setThreshold: vi.fn(),
} as unknown as ReturnType<typeof useTimerNotification>

function renderSideNav() {
  return render(
    <MemoryRouter>
      <SideNav
        userEmail="me@example.com"
        onSignOut={vi.fn()}
        isSigningOut={false}
        notification={notification}
        isDesktop={false}
        isPrefsOpen={false}
        onTogglePrefs={vi.fn()}
        onClosePrefs={vi.fn()}
        prefsButtonRef={{ current: null }}
      />
    </MemoryRouter>
  )
}

describe('SideNav', () => {
  beforeEach(() => {
    timerState.isRunning = false
    timerState.activeEntry = null
  })

  it('gives every navigation link an accessible name', () => {
    renderSideNav()

    for (const label of ['Today', 'Calendar', 'Reports', 'Projects']) {
      expect(screen.getByRole('link', { name: label })).toBeTruthy()
    }
  })

  it('keeps the Today accessible name while a timer runs', () => {
    timerState.isRunning = true
    timerState.activeEntry = { started_at: new Date().toISOString() }

    renderSideNav()

    expect(screen.getByRole('link', { name: 'Today' })).toBeTruthy()
  })

  it('offers Settings as the fifth tab', () => {
    renderSideNav()

    expect(screen.getByRole('button', { name: 'Preferences' })).toBeTruthy()
    expect(screen.getByText('Settings')).toBeTruthy()
  })
})
