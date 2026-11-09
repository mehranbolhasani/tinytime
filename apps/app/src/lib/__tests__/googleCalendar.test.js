import { describe, expect, it } from 'vitest'
import { normalizeGoogleEvent } from '../googleCalendar'

describe('normalizeGoogleEvent — description', () => {
  it('converts HTML descriptions to collapsed plain text', () => {
    const event = normalizeGoogleEvent({
      status: 'confirmed',
      summary: 'Standup',
      description: '<p>Hello <b>world</b></p>\n<p>  Second   line </p>',
      start: { dateTime: '2026-07-27T09:00:00' },
      end: { dateTime: '2026-07-27T10:00:00' },
    })

    expect(event?.description).toBe('Hello world Second line')
  })

  it('returns an empty description when missing', () => {
    const event = normalizeGoogleEvent({
      status: 'confirmed',
      summary: 'Standup',
      start: { dateTime: '2026-07-27T09:00:00' },
      end: { dateTime: '2026-07-27T10:00:00' },
    })

    expect(event?.description).toBe('')
  })
})
