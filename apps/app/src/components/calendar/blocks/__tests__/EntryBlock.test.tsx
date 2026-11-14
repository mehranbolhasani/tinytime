import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EntryBlock from '../EntryBlock'
import type { CalendarBlock } from '@/types'

function makeBlock(height: number): CalendarBlock {
  return {
    entry: {
      id: 'entry-1',
      started_at: '2026-07-29T09:00:00.000Z',
      stopped_at: '2026-07-29T10:30:00.000Z',
      duration_seconds: 5400,
      description: 'Deep work',
      project_id: 'project-1',
      projects: { id: 'project-1', name: 'Tinytime', color: '#e76f51' },
    },
    top: 0,
    height,
    startMs: 0,
    endMs: 0,
    lane: 0,
    laneCount: 1,
  }
}

const handlers = {
  onSelect: vi.fn(),
  onOpenMenu: vi.fn(),
}

describe('EntryBlock', () => {
  it('renders one row for short blocks', () => {
    const { container } = render(<EntryBlock block={makeBlock(48)} {...handlers} />)

    expect(container.querySelectorAll('p')).toHaveLength(0)
    expect(container.querySelector('button > div')?.className).toContain('items-center')
    expect(container.textContent).toContain('Tinytime')
    expect(container.textContent).toContain('Deep work')
    expect(container.textContent).toContain('1h 30m')
    expect(container.querySelector('button')?.className).toContain('py-1')
  })

  it('keeps the three-line layout for tall blocks', () => {
    const { container } = render(<EntryBlock block={makeBlock(80)} {...handlers} />)

    expect(container.querySelectorAll('p')).toHaveLength(3)
    expect(container.querySelector('button')?.className).toContain('py-2')
  })
})
