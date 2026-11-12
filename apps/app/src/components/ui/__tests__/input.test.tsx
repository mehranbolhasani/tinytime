import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Input } from '../input'

describe('Input', () => {
  it('applies the sm height', () => {
    render(<Input size="sm" aria-label="Name" />)

    expect(screen.getByLabelText('Name')).toHaveClass('h-8')
  })

  it('passes aria-invalid through to the element', () => {
    render(<Input aria-label="Email" aria-invalid="true" />)

    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })
})
