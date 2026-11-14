import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ClockDial from '../ClockDial'
import type { DialArc } from '@/lib/clockCalendar'
import type { TimeEntry } from '@/types'

const dayStart = new Date(2026, 6, 29)

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'entry-1',
    started_at: new Date(2026, 6, 29, 9, 0, 0).toISOString(),
    stopped_at: new Date(2026, 6, 29, 10, 0, 0).toISOString(),
    duration_seconds: 3600,
    description: 'Deep work',
    project_id: null,
    projects: null,
    ...overrides,
  }
}

function makeArc(overrides: Partial<DialArc> = {}): DialArc {
  return {
    entry: makeEntry(),
    startMinute: 540,
    endMinute: 600,
    lane: 0,
    isRunning: false,
    label: 'Deep work',
    color: '#eab308',
    ...overrides,
  }
}

function renderDial(props: Partial<React.ComponentProps<typeof ClockDial>> = {}) {
  return render(
    <ClockDial
      dayStart={dayStart}
      arcs={[]}
      activeEntry={null}
      centerPrimary="3h 00m"
      {...props}
    />
  )
}

describe('ClockDial', () => {
  it('draws the face before any arcs so the dial is usable while loading', () => {
    const { container } = renderDial({ arcs: [] })

    expect(container.querySelectorAll('line').length).toBeGreaterThan(20)
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('[data-dial-arc]')).toHaveLength(0)
    expect(container.textContent).toContain('3h 00m')
  })

  it('renders one labelled arc per entry', () => {
    const { container } = renderDial({ arcs: [makeArc({ endMinute: 720 })] })

    const groups = container.querySelectorAll('[data-dial-arc]')
    expect(groups).toHaveLength(1)
    expect(container.textContent).toContain('Deep work')
  })

  it('fades the arcs when dimmed while keeping them inert', () => {
    const { container } = renderDial({ arcs: [makeArc()], dimmed: true, interactive: false })

    const arcsGroup = container.querySelector('svg > g[opacity="0.4"]')
    expect(arcsGroup).not.toBeNull()
    expect(arcsGroup?.querySelector('[role="button"]')).toBeNull()
  })

  it('keeps the arcs interactive when not dimmed', () => {
    const onArcActivate = vi.fn()
    const { container } = renderDial({
      arcs: [makeArc()],
      interactive: true,
      onArcActivate,
    })

    expect(container.querySelector('[data-dial-arc][role="button"]')).not.toBeNull()
    expect(container.querySelector('svg > g[opacity="0.4"]')).toBeNull()
  })
})
