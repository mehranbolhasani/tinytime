import { useEffect, useMemo, useRef, useState } from 'react'
import ActiveTimerBlock from '@/components/calendar/blocks/ActiveTimerBlock'
import EntryBlock from '@/components/calendar/blocks/EntryBlock'
import EntryEditDialog from '@/components/calendar/EntryEditDialog'
import { useTimerContext } from '@/contexts/TimerContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  addDays,
  assignOverlapLanes,
  getNowLinePosition,
  GRID_HEIGHT,
  HOURS,
  HOUR_HEIGHT,
  isSameDay,
  MIN_ENTRY_HEIGHT,
  startOfDay,
  toBlock,
} from '@/lib/calendar'

export default function DayView({ selectedDate, entries, activeEntry, entryTagsByEntryId = {} }) {
  const scrollRef = useRef(null)
  const [editingEntry, setEditingEntry] = useState(null)
  const [now, setNow] = useState(() => new Date())
  const { elapsed } = useTimerContext()
  const isTouchViewport = useMediaQuery('(hover: none)')
  const minEntryHeight = isTouchViewport ? 28 : MIN_ENTRY_HEIGHT
  const dayStart = useMemo(() => startOfDay(selectedDate), [selectedDate])
  const dayEnd = useMemo(() => addDays(dayStart, 1), [dayStart])
  const isSelectedToday = isSameDay(selectedDate, now)

  const completedBlocks = useMemo(() => {
    const blocks = entries
      .filter((entry) => entry.started_at && entry.stopped_at)
      .map((entry) => toBlock(entry, dayStart, dayEnd, entry.duration_seconds ?? 0, minEntryHeight))
      .filter(Boolean)

    return assignOverlapLanes(blocks)
  }, [entries, dayStart, dayEnd, minEntryHeight])

  const activeBlock = useMemo(() => {
    if (!activeEntry?.started_at) {
      return null
    }
    const startedAt = new Date(activeEntry.started_at)
    if (!isSameDay(startedAt, dayStart)) {
      return null
    }

    return toBlock(activeEntry, dayStart, dayEnd, elapsed, minEntryHeight)
  }, [activeEntry, dayStart, dayEnd, elapsed, minEntryHeight])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date())
    }, 60_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) {
      return
    }

    const targetHour = Math.max(0, new Date().getHours() - 2)
    container.scrollTop = targetHour * HOUR_HEIGHT
  }, [])

  return (
    <>
      <div ref={scrollRef} className="h-[calc(100dvh-14rem)] overflow-auto rounded-2xl border border-border bg-card md:h-[70vh]">
        <div className="grid grid-cols-[56px_1fr]">
          <div className="relative border-r border-border bg-secondary/50" style={{ height: GRID_HEIGHT }}>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute inset-x-0 border-t border-border px-2 text-right font-mono text-xs text-muted-foreground/70"
                style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT, lineHeight: '64px' }}
              >
                {String(hour).padStart(2, '0')}
              </div>
            ))}
          </div>

          <div className="relative" style={{ height: GRID_HEIGHT }}>
            {HOURS.map((hour) => (
              <div
                key={`line-${hour}`}
                className="absolute inset-x-0 border-t border-border/70"
                style={{ top: hour * HOUR_HEIGHT }}
              />
            ))}

            {completedBlocks.map((block) => (
              <EntryBlock
                key={block.entry.id}
                block={block}
                tags={entryTagsByEntryId[block.entry.id] ?? []}
                onClick={() => {
                  setEditingEntry(block.entry)
                }}
              />
            ))}

            {activeBlock ? (
              <ActiveTimerBlock
                block={activeBlock}
                elapsed={elapsed}
                onClick={() => setEditingEntry(activeBlock.entry)}
              />
            ) : null}

            {isSelectedToday ? (
              <div
                className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                style={{ top: getNowLinePosition(now) }}
              >
                <span className="h-2 w-2 -translate-x-1 rounded-full bg-primary" />
                <div className="flex-1 border-t border-primary" />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <EntryEditDialog
        entry={editingEntry}
        open={Boolean(editingEntry)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingEntry(null)
          }
        }}
      />
    </>
  )
}
