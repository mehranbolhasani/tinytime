import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ProjectSelect from '../ProjectSelect'
import type { Project } from '@/types'

const PROJECTS: Project[] = [
  { id: 'project-1', name: 'Alpha', color: '#ef4444', created_at: null },
  { id: 'project-2', name: 'Beta', color: null, created_at: null },
]

function openSelect() {
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })
}

describe('ProjectSelect', () => {
  it('shows "No project" when the value is null', () => {
    render(<ProjectSelect value={null} onChange={vi.fn()} projects={PROJECTS} />)

    expect(screen.getByRole('combobox')).toHaveTextContent('No project')
  })

  it('shows the selected project name', () => {
    render(<ProjectSelect value="project-1" onChange={vi.fn()} projects={PROJECTS} />)

    expect(screen.getByRole('combobox')).toHaveTextContent('Alpha')
  })

  it('calls onChange(null) when choosing "No project"', () => {
    const onChange = vi.fn()
    render(<ProjectSelect value="project-1" onChange={onChange} projects={PROJECTS} />)

    openSelect()
    fireEvent.click(screen.getByRole('option', { name: /No project/i }))

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('calls onChange(id) when choosing a project', () => {
    const onChange = vi.fn()
    render(<ProjectSelect value={null} onChange={onChange} projects={PROJECTS} />)

    openSelect()
    fireEvent.click(screen.getByRole('option', { name: /Beta/i }))

    expect(onChange).toHaveBeenCalledWith('project-2')
  })
})
