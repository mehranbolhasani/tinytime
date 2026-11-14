import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ActiveTimerBlock from '@/components/calendar/blocks/ActiveTimerBlock'
import EntryBlock from '@/components/calendar/blocks/EntryBlock'
import GoogleEventBlock from '@/components/calendar/blocks/GoogleEventBlock'
import AllDayEvents from '@/components/calendar/AllDayEvents'
import DragPreview from '@/components/calendar/DragPreview'
import EntryActionDialogs from '@/components/calendar/EntryActionDialogs'
import EntryContextMenu from '@/components/calendar/EntryContextMenu'
import HourGutter from '@/components/calendar/HourGutter'
import NowLine from '@/components/calendar/NowLine'
import { useTimerContext } from '@/contexts/TimerContext'
import { useDayViewDrag } from '@/hooks/useDayViewDrag'
import { useEntryActions } from '@/hooks/useEntryActions'
import { useLocalDay } from '@/hooks/useLocalDay'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useTimerControlActions } from '@/hooks/useTimerControlActions'
import {
  assignIntervalLanes,
  getGridHeight,
  HOURS,
  MIN_ENTRY_HEIGHT,
  toBlock,
  toBlockGeometry,
  type BlockGeometry,
} from '@/lib/calendar'
import { addDays, isSameDay, startOfDay } from '@/lib/dates'
import { isOptimisticEntry } from '@/lib/timer'
import type { CalendarBlock, NormalizedGoogleEvent, TimeEntry } from '@/types'

type GoogleCalendarBlock = BlockGeometry & {
  event: NormalizedGoogleEvent
  lane: number
  laneCount: number
}

function withLanes<T extends { startMs: number; endMs: number }>(blocks: T[]): T[] {
  return assignIntervalLanes(
    blocks,
    (block) => block.startMs,
    (block) => block.endMs
  ).map(({ item, lane, laneCount }) => ({ ...item, lane, laneCount }))
}

interface MenuState {
  open: boolean
  entry: TimeEntry
  x: number
  y: number
  returnFocusTo?: HTMLElement | null
}

interface DayViewProps {
  selectedDate: Date
  entries: TimeEntry[]
  activeEntry: TimeEntry | null
  googleEvents?: NormalizedGoogleEvent[]
  isLoadingGoogleEvents?: boolean
  hourHeight?: number
  viewportHeight?: string
  onSwitchToClock?: () => void
}

export default function DayView({
  selectedDate,
  entries,
  activeEntry,
  googleEvents = [],
  isLoadingGoogleEvents = false,
  hourHeight = 32,
  viewportHeight = 'clamp(420px, 70dvh, 720px)',
  onSwitchToClock,
}: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [menuState, setMenuState] = useState<MenuState | null>(null)
  const { isRunning } = useTimerContext()
  const actions = useEntryActions({ entries })
  const { startTimer } = useTimerControlActions()
  const isTouchViewport = useMediaQuery('(hover: none)')
  const minEntryHeight = isTouchViewport ? 28 : MIN_ENTRY_HEIGHT
  const gridHeight = getGridHeight(hourHeight)
  const dayStart = useMemo(() => startOfDay(selectedDate), [selectedDate])
  const dayEnd = useMemo(() => addDays(dayStart, 1), [dayStart])
  const today = useLocalDay()
  const isSelectedToday = isSameDay(selectedDate, today)

  const {
    entriesForRendering,
    previewBlock,
    draggingEntryId,
    blockDragHandlers,
    gridHandlers,
  } = useDayViewDrag({
    entries,
    dayStart,
    hourHeight,
    minEntryHeight,
    updateEntry: actions.updateEntry,
    createEntry: actions.createEntry,
    onCreated: actions.openEdit,
    onError: actions.setError,
    clearError: actions.clearError,
  })

  const completedBlocks = useMemo(() => {
    const blocks = entriesForRendering
      .filter((entry) => entry.started_at && entry.stopped_at)
      .map((entry) => toBlock(entry, dayStart, dayEnd, entry.duration_seconds ?? 0, minEntryHeight, hourHeight))
      .filter((b): b is CalendarBlock => b !== null)

    return withLanes(blocks)
  }, [entriesForRendering, dayStart, dayEnd, minEntryHeight, hourHeight])

  const { timedGoogleEvents, allDayGoogleEvents } = useMemo(() => {
    const timed: NormalizedGoogleEvent[] = []
    const allDay: NormalizedGoogleEvent[] = []

    googleEvents.forEach((event) => {
      if (event.isAllDay) {
        allDay.push(event)
      } else {
        timed.push(event)
      }
    })

    return { timedGoogleEvents: timed, allDayGoogleEvents: allDay }
  }, [googleEvents])

  const googleBlocks = useMemo(() => {
    const blocks = timedGoogleEvents
      .map((event) => {
        const start = new Date(event.startedAt)
        const end = new Date(event.stoppedAt)
        const geometry = toBlockGeometry(
          start.getTime(),
          end.getTime(),
          dayStart,
          dayEnd,
          minEntryHeight,
          hourHeight
        )

        if (!geometry) {
          return null
        }

        return {
          ...geometry,
          event,
          lane: 0,
          laneCount: 1,
        }
      })
      .filter((b): b is GoogleCalendarBlock => b !== null)

    return withLanes(blocks)
  }, [dayEnd, dayStart, minEntryHeight, timedGoogleEvents, hourHeight])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) {
      return
    }

    const targetHour = Math.max(0, new Date().getHours() - 2)
    container.scrollTop = targetHour * hourHeight
  }, [hourHeight])

  const handleOpenMenu = useCallback(
    (entry: TimeEntry, x: number, y: number, returnFocusTo?: HTMLElement | null) => {
      setMenuState({ open: true, entry, x, y, returnFocusTo })
    },
    []
  )

  const handleStartFromGoogleEvent = async (event: NormalizedGoogleEvent): Promise<void> => {
    if (isRunning) {
      actions.setError('Stop the active timer before starting one from a Google event.')
      return
    }

    const eventStart = new Date(event.startedAt)
    const eventStop = new Date(event.stoppedAt)
    const nowDate = new Date()

    if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventStop.getTime())) {
      actions.setError('Unable to start timer from an event with invalid dates.')
      return
    }

    try {
      actions.clearError()

      if (eventStop.getTime() > nowDate.getTime()) {
        await startTimer({ description: event.title ?? '' })
        return
      }

      const durationSeconds = Math.max(60, Math.round((eventStop.getTime() - eventStart.getTime()) / 1000))

      await actions.createEntry({
        project_id: null,
        description: event.title ?? '',
        started_at: eventStart.toISOString(),
        stopped_at: eventStop.toISOString(),
        duration_seconds: durationSeconds,
      })
    } catch (error) {
      actions.setError(error instanceof Error ? error.message : 'Unable to create a timer entry from this event.')
    }
  }

  return (
    <>
      {actions.error ? (
        <div role="alert" className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actions.error}
        </div>
      ) : null}
      <div
        ref={scrollRef}
        className="overflow-y-auto overflow-x-hidden bg-background h-full flex-1"
        style={{ height: viewportHeight }}
      >
        <AllDayEvents
          events={allDayGoogleEvents}
          onStart={handleStartFromGoogleEvent}
          disabled={isRunning}
        />
        <div className="grid grid-cols-[56px_1fr] h-full">
          <HourGutter hourHeight={hourHeight} gridHeight={gridHeight} />

          <div
            className="relative"
            style={{ height: gridHeight }}
            {...gridHandlers}
          >
            {HOURS.map((hour) => (
              <div
                key={`line-${hour}`}
                className="pointer-events-none absolute inset-x-0 border-t border-border/70"
                style={{ top: hour * hourHeight }}
              />
            ))}

            <DragPreview previewBlock={previewBlock} />

            {googleBlocks.map((block) => (
              <GoogleEventBlock
                key={`google-${block.event.id}-${block.startMs}`}
                block={block}
                event={block.event}
                onStartTimer={handleStartFromGoogleEvent}
                disableStart={isRunning}
              />
            ))}

            {completedBlocks.map((block) => (
              <EntryBlock
                key={block.entry.id}
                block={block}
                isDragging={draggingEntryId === block.entry.id}
                onSelect={actions.openEntry}
                onOpenMenu={handleOpenMenu}
                onDragStart={blockDragHandlers.onDragStart}
                onDragEnd={blockDragHandlers.onDragEnd}
              />
            ))}

            {activeEntry && isSameDay(new Date(activeEntry.started_at), dayStart) ? (
              <ActiveTimerBlock
                activeEntry={activeEntry}
                dayStart={dayStart}
                dayEnd={dayEnd}
                hourHeight={hourHeight}
                minEntryHeight={minEntryHeight}
                onClick={() => {
                  if (!isOptimisticEntry(activeEntry)) {
                    actions.openEdit(activeEntry)
                  }
                }}
              />
            ) : null}

            {isSelectedToday ? <NowLine hourHeight={hourHeight} /> : null}
          </div>
        </div>
        {isLoadingGoogleEvents ? (
          <div className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">Loading Google events...</div>
        ) : null}
      </div>

      {isTouchViewport ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          To log time on touch, use the clock view.
          {onSwitchToClock ? (
            <>
              {' '}
              <button
                type="button"
                onClick={onSwitchToClock}
                className="font-medium text-foreground underline underline-offset-2"
              >
                Open clock view
              </button>
            </>
          ) : null}
        </p>
      ) : null}

      <EntryActionDialogs actions={actions} />
      <EntryContextMenu
        menuState={menuState}
        onClose={() => setMenuState(null)}
        onEdit={actions.openEdit}
        onDuplicate={actions.duplicateAndReport}
        onDelete={actions.requestDelete}
      />
    </>
  )
}
