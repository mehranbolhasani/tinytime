import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../button'

describe('Button', () => {
  it('applies the emphasis classes to the default variant', () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole('button')).toHaveClass('btn-emphasis')
  })

  it('renders a single element with asChild and keeps the variant classes', () => {
    const { container } = render(
      <Button asChild>
        <a href="/example">Go</a>
      </Button>
    )

    const link = screen.getByRole('link')
    expect(link.tagName).toBe('A')
    expect(link).toHaveClass('btn-emphasis')
    expect(container.querySelectorAll('a')).toHaveLength(1)
    expect(container.querySelectorAll('span')).toHaveLength(0)
  })

  it('passes disabled through and does not call onClick', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
