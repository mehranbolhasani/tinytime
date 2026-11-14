import { act, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppLayout from '../AppLayout'

vi.mock('@/components/layout/AppRoutes', () => ({ default: () => <div>page content</div> }))
vi.mock('@/components/layout/routePreload', () => ({
  preloadAllRoutesWhenIdle: () => () => {},
  preloadRoute: vi.fn(),
}))
vi.mock('@/components/timer/MiniTimerPill', () => ({ default: () => null }))
vi.mock('@/components/IdleDetectionDialog', () => ({ default: () => null }))
vi.mock('@/components/CommandPalette', () => ({ default: () => null }))
vi.mock('@/components/ui/sonner', () => ({ default: () => null }))
vi.mock('@/components/settings/GoogleCalendarSection', () => ({
  default: () => <div>Google Calendar</div>,
}))
vi.mock('@/contexts/TimerContext', () => ({ useTimerContext: () => ({ isRunning: false }) }))
vi.mock('@/hooks/useTimerNotification', () => ({
  useTimerNotification: () => ({
    permissionState: 'unsupported',
    thresholdMinutes: 0,
    setThreshold: vi.fn(),
  }),
}))
vi.mock('@/hooks/useTimerControlActions', () => ({
  useTimerControlActions: () => ({ toggleTimer: vi.fn(), stopTimer: vi.fn() }),
}))
vi.mock('@/hooks/useIdleDetection', () => ({ useIdleDetection: vi.fn() }))
vi.mock('@/hooks/useAppKeyboardShortcuts', () => ({ useAppKeyboardShortcuts: vi.fn() }))

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

function renderLayout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AppLayout userEmail="me@example.com" onSignOut={vi.fn()} isSigningOut={false} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function mainElement(container: HTMLElement): HTMLElement {
  const main = container.querySelector('main')
  if (!main) throw new Error('main not found')
  return main
}

function contentRegion(): HTMLElement {
  return screen.getByRole('region', { name: 'Preferences' })
}

describe('AppLayout preferences panel', () => {
  beforeEach(() => {
    stubMatchMedia()
    window.localStorage.clear()
  })

  it('leaves main untranslated while closed', () => {
    const { container } = renderLayout()

    const main = mainElement(container)
    expect(main.className).not.toMatch(/(^|\s)-?translate-[xy]-/)
    expect(contentRegion()).toHaveAttribute('inert')
  })

  it('pushes main with a translate class and traps focus away from the page when open', () => {
    const { container } = renderLayout()

    act(() => screen.getByRole('button', { name: 'Preferences' }).click())

    const main = mainElement(container)
    expect(main.className).toContain('translate-x-(--prefs-w)')
    expect(screen.getByRole('button', { name: 'Preferences' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(contentRegion()).not.toHaveAttribute('inert')

    const pageContent = screen.getByText('page content').parentElement
    expect(pageContent).toHaveAttribute('inert')
  })

  it('closes with the cog, returning focus to it', async () => {
    renderLayout()
    const cog = screen.getByRole('button', { name: 'Preferences' })

    act(() => cog.click())
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Preferences' })).toHaveFocus()
    )

    act(() => cog.click())

    expect(contentRegion()).toHaveAttribute('inert')
    await waitFor(() => expect(cog).toHaveFocus())
  })

  it('closes on Escape', async () => {
    renderLayout()

    act(() => screen.getByRole('button', { name: 'Preferences' }).click())
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Preferences' })).toHaveFocus()
    )

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(contentRegion()).toHaveAttribute('inert')
  })

  it('closes when the pushed main card is clicked', () => {
    const { container } = renderLayout()

    act(() => screen.getByRole('button', { name: 'Preferences' }).click())
    act(() => screen.getByRole('button', { name: 'Close preferences' }).click())

    expect(contentRegion()).toHaveAttribute('inert')
    expect(mainElement(container).className).not.toMatch(/(^|\s)-?translate-[xy]-/)
  })
})
