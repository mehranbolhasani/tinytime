import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { minuteToAngle } from '@/lib/clockCalendar'
import { useClockGestures } from '../useClockGestures.js'

function makeSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 400,
    height: 400,
    right: 400,
    bottom: 400,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
  document.body.appendChild(svg)
  return svg
}

function makeBin() {
  const bin = document.createElement('div')
  bin.getBoundingClientRect = () => ({
    left: 0,
    top: 400,
    width: 200,
    height: 100,
    right: 200,
    bottom: 500,
    x: 0,
    y: 400,
    toJSON: () => ({}),
  })
  document.body.appendChild(bin)
  return bin
}

function pointAt(minute, fraction = 0.75) {
  const angle = minuteToAngle(minute)
  return {
    clientX: 200 + 200 * fraction * Math.cos(angle),
    clientY: 200 + 200 * fraction * Math.sin(angle),
  }
}

function firePointer(type, point) {
  window.dispatchEvent(
    new MouseEvent(type, {
      clientX: point.clientX,
      clientY: point.clientY,
      bubbles: true,
    })
  )
}

function pointerDownEvent(svg, point) {
  return {
    ...point,
    pointerId: 1,
    target: svg,
    currentTarget: svg,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  }
}

function setup({ maxMinute = 1440 } = {}) {
  const svg = makeSvg()
  const bin = makeBin()
  const svgRef = { current: svg }
  const binRef = { current: bin }
  const onCreateDraft = vi.fn()
  const onCommitMove = vi.fn()
  const onRequestDelete = vi.fn()
  const onActivate = vi.fn()
  const onPointerPosition = vi.fn()

  const { result } = renderHook(() =>
    useClockGestures({
      dayStart: new Date(2026, 6, 29),
      arcs: [],
      maxMinute,
      svgRef,
      binRef,
      onCreateDraft,
      onCommitMove,
      onRequestDelete,
      onActivate,
      onPointerPosition,
    })
  )

  return {
    result,
    svg,
    bin,
    onCreateDraft,
    onCommitMove,
    onRequestDelete,
    onActivate,
    onPointerPosition,
  }
}

function makeArc(entry, startMinute = 540, endMinute = 600) {
  return {
    entry,
    startMinute,
    endMinute,
    lane: 0,
    isRunning: false,
    label: 'Work',
    color: '#eab308',
  }
}

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

/** Pointer moves are coalesced into one update per animation frame. */
function nextFrame() {
  act(() => {
    vi.advanceTimersByTime(20)
  })
}

describe('useClockGestures', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
  })

  it('does not create anything on a tap', () => {
    const { result, svg, onCreateDraft } = setup()
    const start = pointAt(540)

    act(() => result.current.onTrackPointerDown(pointerDownEvent(svg, start)))
    act(() => firePointer('pointerup', start))

    expect(onCreateDraft).not.toHaveBeenCalled()
    expect(result.current.draft).toBeNull()
  })

  it('turns a 09:00 to 10:30 sweep into a draft', () => {
    const { result, svg, onCreateDraft } = setup()

    act(() => result.current.onTrackPointerDown(pointerDownEvent(svg, pointAt(540))))
    act(() => firePointer('pointermove', pointAt(630)))
    act(() => firePointer('pointerup', pointAt(630)))

    expect(onCreateDraft).toHaveBeenCalledWith({ startMinute: 540, endMinute: 630 })
  })

  it('clamps a sweep that crosses the top instead of wrapping', () => {
    const { result, svg, onCreateDraft } = setup()

    act(() => result.current.onTrackPointerDown(pointerDownEvent(svg, pointAt(23 * 60 + 30))))
    act(() => firePointer('pointermove', pointAt(10)))
    act(() => firePointer('pointerup', pointAt(10)))

    expect(onCreateDraft).toHaveBeenCalledWith({
      startMinute: 23 * 60 + 30,
      endMinute: 1440,
    })
  })

  it("clamps today's sweep to the current minute", () => {
    const { result, svg, onCreateDraft } = setup({ maxMinute: 1100 })

    act(() => result.current.onTrackPointerDown(pointerDownEvent(svg, pointAt(990))))
    act(() => firePointer('pointermove', pointAt(1200)))
    act(() => firePointer('pointerup', pointAt(1200)))

    expect(onCreateDraft).toHaveBeenCalledWith({ startMinute: 990, endMinute: 1095 })
  })

  it('activates an arc on a tap without moving it', () => {
    const { result, svg, onActivate, onCommitMove } = setup()
    const arc = {
      entry: { id: 'entry-tap' },
      startMinute: 540,
      endMinute: 600,
      lane: 0,
      isRunning: false,
      label: 'Work',
      color: '#eab308',
    }
    const point = pointAt(570)

    act(() =>
      result.current.onArcPointerDown(arc, 'body', pointerDownEvent(svg, point))
    )
    act(() => firePointer('pointerup', point))

    expect(onActivate).toHaveBeenCalledWith(arc)
    expect(onCommitMove).not.toHaveBeenCalled()
  })

  it('commits a moved arc when dropped away from the bin', () => {
    const { result, svg, onCommitMove, onRequestDelete } = setup()
    const entry = { id: 'entry-move' }
    const arc = {
      entry,
      startMinute: 540,
      endMinute: 600,
      lane: 0,
      isRunning: false,
      label: 'Work',
      color: '#eab308',
    }

    act(() =>
      result.current.onArcPointerDown(arc, 'body', pointerDownEvent(svg, pointAt(570)))
    )
    act(() => firePointer('pointermove', pointAt(630)))
    act(() => firePointer('pointerup', pointAt(630)))

    expect(onCommitMove).toHaveBeenCalledWith(entry, 600, 660)
    expect(onRequestDelete).not.toHaveBeenCalled()
  })

  it('deletes when a moved arc is dropped on the bin', () => {
    const { result, svg, onRequestDelete, onCommitMove } = setup()
    const entry = { id: 'entry-1' }
    const arc = {
      entry,
      startMinute: 540,
      endMinute: 600,
      lane: 0,
      isRunning: false,
      label: 'Work',
      color: '#eab308',
    }

    act(() =>
      result.current.onArcPointerDown(
        arc,
        'body',
        pointerDownEvent(svg, pointAt(570))
      )
    )
    act(() => firePointer('pointermove', pointAt(600)))
    act(() => firePointer('pointerup', { clientX: 50, clientY: 450 }))

    expect(onRequestDelete).toHaveBeenCalledWith(entry)
    expect(onCommitMove).not.toHaveBeenCalled()
  })

  it('freezes the draft outside the dial and continues without a jump', () => {
    const { result, svg } = setup()
    const entry = { id: 'entry-detach' }
    const arc = makeArc(entry)

    act(() =>
      result.current.onArcPointerDown(arc, 'body', pointerDownEvent(svg, pointAt(570)))
    )
    act(() => firePointer('pointermove', pointAt(600)))
    nextFrame()
    expect(result.current.draft).toEqual({ startMinute: 570, endMinute: 630 })

    // Outside the dial (radius fraction > 1.08), at the bottom angle (12:00).
    act(() => firePointer('pointermove', { clientX: 200, clientY: 700 }))
    nextFrame()
    expect(result.current.isDetached).toBe(true)
    expect(result.current.draft).toEqual({ startMinute: 570, endMinute: 630 })

    // Back inside at the same angle: no jump.
    act(() => firePointer('pointermove', { clientX: 200, clientY: 350 }))
    nextFrame()
    expect(result.current.isDetached).toBe(false)
    expect(result.current.draft).toEqual({ startMinute: 570, endMinute: 630 })

    // Continuing clockwise adds to the frozen sweep.
    act(() => firePointer('pointermove', pointAt(750)))
    nextFrame()
    expect(result.current.draft).toEqual({ startMinute: 600, endMinute: 660 })
  })

  it('cancels a move released outside the dial away from the bin', () => {
    const { result, svg, onCommitMove, onRequestDelete } = setup()
    const entry = { id: 'entry-cancel' }
    const arc = makeArc(entry)

    act(() =>
      result.current.onArcPointerDown(arc, 'body', pointerDownEvent(svg, pointAt(570)))
    )
    act(() => firePointer('pointermove', pointAt(600)))
    act(() => firePointer('pointermove', { clientX: 200, clientY: 700 }))
    act(() => firePointer('pointerup', { clientX: 200, clientY: 700 }))

    expect(onCommitMove).not.toHaveBeenCalled()
    expect(onRequestDelete).not.toHaveBeenCalled()
    expect(result.current.draft).toBeNull()
  })

  it('deletes when released over the bin while detached', () => {
    const { result, svg, onRequestDelete } = setup()
    const entry = { id: 'entry-bin-detached' }
    const arc = makeArc(entry)

    act(() =>
      result.current.onArcPointerDown(arc, 'body', pointerDownEvent(svg, pointAt(570)))
    )
    act(() => firePointer('pointermove', pointAt(600)))
    act(() => firePointer('pointermove', { clientX: 50, clientY: 450 }))
    act(() => firePointer('pointerup', { clientX: 50, clientY: 450 }))

    expect(onRequestDelete).toHaveBeenCalledWith(entry)
  })

  it('reports one pointer position per frame', () => {
    const { result, svg, onPointerPosition } = setup()

    act(() => result.current.onTrackPointerDown(pointerDownEvent(svg, pointAt(540))))
    act(() => firePointer('pointermove', pointAt(545)))
    nextFrame()
    act(() => firePointer('pointermove', pointAt(600)))
    nextFrame()
    act(() => firePointer('pointermove', pointAt(620)))
    act(() => firePointer('pointermove', pointAt(630)))
    nextFrame()

    expect(onPointerPosition).toHaveBeenCalledTimes(3)
    expect(onPointerPosition).toHaveBeenLastCalledWith(
      pointAt(630).clientX,
      pointAt(630).clientY
    )
  })

  it('reads the dial rect once per gesture', () => {
    const { result, svg } = setup()
    const originalGetRect = svg.getBoundingClientRect.bind(svg)
    const getRect = vi.fn(() => originalGetRect())
    svg.getBoundingClientRect = getRect

    act(() => result.current.onTrackPointerDown(pointerDownEvent(svg, pointAt(540))))
    act(() => firePointer('pointermove', pointAt(600)))
    nextFrame()
    act(() => firePointer('pointermove', pointAt(630)))
    nextFrame()
    act(() => firePointer('pointerup', pointAt(660)))

    expect(getRect).toHaveBeenCalledTimes(1)
  })

  it('lands where the pointer is released even when moves are coalesced', () => {
    const { result, svg, onCommitMove } = setup()
    const arc = makeArc({ id: 'entry-fast' })

    act(() =>
      result.current.onArcPointerDown(arc, 'body', pointerDownEvent(svg, pointAt(570)))
    )
    act(() => {
      firePointer('pointermove', pointAt(600))
      firePointer('pointermove', pointAt(630))
      firePointer('pointerup', pointAt(660))
    })

    expect(onCommitMove).toHaveBeenCalledWith(arc.entry, 630, 690)
  })

  it('reverts on pointercancel', () => {
    const { result, svg, onCreateDraft } = setup()

    act(() => result.current.onTrackPointerDown(pointerDownEvent(svg, pointAt(540))))
    act(() => firePointer('pointermove', pointAt(630)))
    nextFrame()
    expect(result.current.draft).not.toBeNull()

    act(() => firePointer('pointercancel', pointAt(630)))

    expect(result.current.draft).toBeNull()
    expect(onCreateDraft).not.toHaveBeenCalled()
  })
})
