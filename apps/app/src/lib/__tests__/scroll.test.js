import { afterEach, describe, expect, it, vi } from 'vitest'
import { scrollToTop } from '../scroll.js'

function stubMotionPreference(reduce) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reduce })))
}

describe('scrollToTop', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('scrolls the element and the window to the top', () => {
    stubMotionPreference(false)
    const element = { scrollTo: vi.fn() }
    const windowScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    window.requestAnimationFrame = vi.fn((callback) => callback())

    scrollToTop(element)

    expect(element.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(windowScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('uses auto when reduced motion is requested', () => {
    stubMotionPreference(true)
    const element = { scrollTo: vi.fn() }
    const windowScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    window.requestAnimationFrame = vi.fn((callback) => callback())

    scrollToTop(element)

    expect(element.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
    expect(windowScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  it('honours an explicit instant behaviour for route changes', () => {
    stubMotionPreference(false)
    const element = { scrollTo: vi.fn() }
    const windowScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    window.requestAnimationFrame = vi.fn((callback) => callback())

    scrollToTop(element, 'auto')

    expect(element.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
    expect(windowScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })
})
