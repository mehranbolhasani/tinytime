import { useEffect, useMemo, useRef, useState } from 'react'
import EntryEditDialog from '@/components/calendar/EntryEditDialog'
import { useTimer } from '@/hooks/useTimer'
import { formatDuration } from '@/lib/utils'

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const HOUR_HEIGHT = 64
const GRID_HEIGHT = HOUR_HEIGHT * 24
const TIME_COLUMN_WIDTH = 56
const MIN_ENTRY_HEIGHT = 20

function startOfDay(date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function getNowLinePosition(nowDate) {
  const minutes = nowDate.getHours() * 60 + nowDate.getMinutes() + nowDate.getSeconds() / 60
  return (minutes / 60) * HOUR_HEIGHT
}

function getProjectColor(entry) {
  return entry?.projects?.color ?? '#a8a29e'
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function toBlock(entry, dayStart, dayEnd, durationSeconds) {
  const start = new Date(entry.started_at)
  const end = entry.stopped_at ? new Date(entry.stopped_at) : new Date(start.getTime() + durationSeconds * 1000)
  const visibleStart = start > dayStart ? start : dayStart
  const visibleEnd = end < dayEnd ? end : dayEnd

  if (visibleEnd <= visibleStart) {
    return null
  }

  const topMinutes = (visibleStart.getTime() - dayStart.getTime()) / 60000
  const durationMinutes = (visibleEnd.getTime() - visibleStart.getTime()) / 60000

  return {
    entry,
    top: (topMinutes / 60) * HOUR_HEIGHT,
    height: Math.max((durationMinutes / 60) * HOUR_HEIGHT, MIN_ENTRY_HEIGHT),
    startMs: visibleStart.getTime(),
    endMs: visibleEnd.getTime(),
    lane: 0,
    hasOverlap: false,
  }
}

function assignOverlapLanes(blocks) {
  const nextBlocks = [...blocks].sort((a, b) => a.startMs - b.startMs)

  for (let i = 0; i < nextBlocks.length; i += 1) {
    for (let j = i + 1; j < nextBlocks.length; j += 1) {
      const first = nextBlocks[i]
      const second = nextBlocks[j]
      const overlaps = first.startMs < second.endMs && second.startMs < first.endMs

      if (!overlaps) {
        continue
      }

      first.hasOverlap = true
      second.hasOverlap = true

      if (first.lane === second.lane) {
        second.lane = first.lane === 0 ? 1 : 0
      }
    }
  }

  return nextBlocks
}

function EntryBlock({ block, onClick, tags }) {
  const width = block.hasOverlap ? 'calc(50% - 6px)' : 'calc(100% - 8px)'
  const left = block.hasOverlap ? `${block.lane * 50}%` : '0%'
  const canShowTags = block.height > 48
  const projectColor = getProjectColor(block.entry)

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute overflow-hidden rounded-lg border-l-2 px-2 py-1 text-left text-[11px] cursor-pointer transition-shadow duration-150 hover:shadow-sm"
      style={{
        top: block.top,
        height: block.height,
        left,
        width,
        backgroundColor: hexToRgba(projectColor, 0.15),
        borderLeftColor: projectColor,
      }}
    >
      <p className="truncate text-xs font-semibold" style={{ color: projectColor }}>
        {block.entry.projects?.name ?? 'No project'}
      </p>
      <p className="truncate text-[11px] text-muted-foreground">{block.entry.description || 'No description'}</p>
      {canShowTags && tags.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full px-1.5 py-0 text-[10px] font-medium"
              style={{ color: tag.color, backgroundColor: hexToRgba(tag.color, 0.15) }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      ) : null}
      <p className="truncate text-[11px] text-muted-foreground">
        {formatDuration(block.entry.duration_seconds ?? 0)}
      </p>
    </button>
  )
}

export default function WeekView({ weekStart, entries, activeEntry, entryTagsByEntryId = {} }) {
  const containerRef = useRef(null)
  const [editingEntry, setEditingEntry] = useState(null)
  const [now, setNow] = useState(() => new Date())
  const { elapsed } = useTimer(activeEntry)
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart])

  const blocksByDay = useMemo(() => {
    const map = {}

    weekDays.forEach((day) => {
      const dayKey = day.toDateString()
      const dayStart = startOfDay(day)
      const dayEnd = addDays(dayStart, 1)
      const dayBlocks = entries
        .filter((entry) => entry.started_at && entry.stopped_at && isSameDay(new Date(entry.started_at), day))
        .map((entry) => toBlock(entry, dayStart, dayEnd, entry.duration_seconds ?? 0))
        .filter(Boolean)

      map[dayKey] = assignOverlapLanes(dayBlocks)
    })

    return map
  }, [entries, weekDays])

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

    return toBlock(activeEntry, dayStart, dayEnd, elapsed)
  }, [activeEntry, activeTimerDayKey, elapsed, weekDays])

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

  const accentColor = activeEntry?.projects?.color ?? '#e76f51'

  return (
    <>
      <div ref={containerRef} className="h-[70vh] overflow-auto rounded-2xl border border-border bg-card">
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
                    <button
                      type="button"
                      onClick={() => setEditingEntry(activeBlock.entry)}
                      className="absolute left-0 overflow-hidden rounded-lg border border-dashed p-2 text-left text-[11px] shadow-sm"
                      style={{
                        top: activeBlock.top,
                        left: 0,
                        width: 'calc(100% - 8px)',
                        height: activeBlock.height,
                        borderColor: accentColor,
                        backgroundColor: hexToRgba(accentColor, 0.1),
                      }}
                    >
                      <p className="truncate text-xs font-semibold text-foreground">
                        {activeBlock.entry.projects?.name ?? 'Active timer'}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {activeBlock.entry.description || 'No description'}
                      </p>
                      <p className="truncate text-[11px] font-medium font-mono text-foreground">{formatDuration(elapsed)}</p>
                    </button>
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
