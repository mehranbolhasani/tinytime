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
  TIME_COLUMN_WIDTH,
  toBlock,
} from '@/lib/calendar'

export default function WeekView({ weekStart, entries, activeEntry, entryTagsByEntryId = {} }) {
  const containerRef = useRef(null)
  const [editingEntry, setEditingEntry] = useState(null)
  const [now, setNow] = useState(() => new Date())
  const { elapsed } = useTimerContext()
  const isTouchViewport = useMediaQuery('(hover: none)')
  const minEntryHeight = isTouchViewport ? 28 : MIN_ENTRY_HEIGHT
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart])

  const blocksByDay = useMemo(() => {
    const map = {}

    weekDays.forEach((day) => {
      const dayKey = day.toDateString()
      const dayStart = startOfDay(day)
      const dayEnd = addDays(dayStart, 1)
      const dayBlocks = entries
        .filter((entry) => entry.started_at && entry.stopped_at && isSameDay(new Date(entry.started_at), day))
        .map((entry) => toBlock(entry, dayStart, dayEnd, entry.duration_seconds ?? 0, minEntryHeight))
        .filter(Boolean)

      map[dayKey] = assignOverlapLanes(dayBlocks)
    })

    return map
  }, [entries, minEntryHeight, weekDays])

  const activeTimerDayKey = useMemo(
    () => weekDays.find((day) => isSameDay(day, now))?.toDateString() ?? null,
    [weekDays, now]
  )

  const activeBlock = useMemo(() => {
    if (!activeEntry?.started_at || !activeTimerDayKey) {
      return null
    }

    const day = weekDays.find((candidate) => candidate.toDateString() === activeTimerDayKey)
    if (!day) {
      return null
    }

    const dayStart = startOfDay(day)
    const dayEnd = addDays(dayStart, 1)
    const activeStart = new Date(activeEntry.started_at)
    if (!isSameDay(activeStart, day)) {
      return null
    }

    return toBlock(activeEntry, dayStart, dayEnd, elapsed, minEntryHeight)
  }, [activeEntry, activeTimerDayKey, elapsed, minEntryHeight, weekDays])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date())
    }, 60_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const targetHour = Math.max(0, new Date().getHours() - 2)
    container.scrollTop = targetHour * HOUR_HEIGHT
  }, [])

  return (
    <>
      <div ref={containerRef} className="h-[calc(100dvh-14rem)] overflow-auto rounded-2xl border border-border bg-card md:h-[70vh]">
        <div className="min-w-[980px]">
          <div
            className="sticky top-0 z-30 grid border-b border-border bg-card"
            style={{ gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(7, minmax(0, 1fr))` }}
          >
            <div className="sticky left-0 z-40 border-r border-border bg-card" />
            {weekDays.map((day) => {
              const isToday = isSameDay(day, now)
              return (
                <div
                  key={day.toISOString()}
                  className="border-r border-border px-3 py-2 text-center last:border-r-0"
                >
                  <span className={
                    isToday
                      ? 'inline-block rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary'
                      : 'text-xs font-medium text-muted-foreground'
                  }>
                    {day.toLocaleDateString([], { weekday: 'short' })} {day.getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          <div
            className="grid"
            style={{ gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(7, minmax(0, 1fr))` }}
          >
            <div className="sticky left-0 z-20 border-r border-border bg-secondary/50" style={{ height: GRID_HEIGHT }}>
              {HOURS.map((hour) => (
                <div
                  key={`hour-${hour}`}
                  className="absolute inset-x-0 border-t border-border px-2 text-right font-mono text-xs text-muted-foreground/70"
                  style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT, lineHeight: '64px' }}
                >
                  {String(hour).padStart(2, '0')}
                </div>
              ))}
            </div>

            {weekDays.map((day) => {
              const dayKey = day.toDateString()
              const isToday = isSameDay(day, now)
              return (
                <div key={`col-${dayKey}`} className="relative border-r border-border last:border-r-0" style={{ height: GRID_HEIGHT }}>
                  {HOURS.map((hour) => (
                    <div
                      key={`${dayKey}-line-${hour}`}
                      className="absolute inset-x-0 border-t border-border/70"
                      style={{ top: hour * HOUR_HEIGHT }}
                    />
                  ))}

                  {(blocksByDay[dayKey] ?? []).map((block) => (
                    <EntryBlock
                      key={block.entry.id}
                      block={block}
                      tags={entryTagsByEntryId[block.entry.id] ?? []}
                      onClick={() => {
                        setEditingEntry(block.entry)
                      }}
                    />
                  ))}

                  {activeBlock && activeTimerDayKey === dayKey ? (
                    <ActiveTimerBlock
                      block={activeBlock}
                      elapsed={elapsed}
                      onClick={() => setEditingEntry(activeBlock.entry)}
                    />
                  ) : null}

                  {isToday ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                      style={{ top: getNowLinePosition(now) }}
                    >
                      <span className="h-2 w-2 -translate-x-1 rounded-full bg-primary" />
                      <div className="flex-1 border-t border-primary" />
                    </div>
                  ) : null}
                </div>
              )
            })}
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
