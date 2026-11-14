import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FloatingAlerts, { FloatingAlert } from '../FloatingAlerts'

describe('FloatingAlert', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a dismiss button that calls onDismiss', () => {
    const onDismiss = vi.fn()
    render(<FloatingAlert onDismiss={onDismiss}>Something failed</FloatingAlert>)

    act(() => screen.getByRole('button', { name: 'Dismiss' }).click())

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('has no dismiss button when there is nothing to dismiss', () => {
    render(<FloatingAlert>Query failed</FloatingAlert>)

    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull()
  })

  it('auto-dismisses after the delay, restarting when the message changes', () => {
    const onDismiss = vi.fn()
    const { rerender } = render(
      <FloatingAlert onDismiss={onDismiss} autoDismissMs={6000}>
        First failure
      </FloatingAlert>
    )

    act(() => vi.advanceTimersByTime(5000))
    expect(onDismiss).not.toHaveBeenCalled()

    rerender(
      <FloatingAlert onDismiss={onDismiss} autoDismissMs={6000}>
        Second failure
      </FloatingAlert>
    )

    act(() => vi.advanceTimersByTime(5000))
    expect(onDismiss).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1500))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('never auto-dismisses without an onDismiss handler', () => {
    render(<FloatingAlert autoDismissMs={1000}>Query failed</FloatingAlert>)

    act(() => vi.advanceTimersByTime(5000))

    expect(screen.getByText('Query failed')).toBeTruthy()
  })

  it('positions alerts over the content without taking layout space', () => {
    const { container } = render(
      <FloatingAlerts>
        <FloatingAlert>Something failed</FloatingAlert>
      </FloatingAlerts>
    )

    const wrapper = container.firstElementChild
    expect(wrapper?.className).toContain('absolute')
    expect(wrapper?.className).toContain('z-30')
  })
})
