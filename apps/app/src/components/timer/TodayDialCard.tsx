import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ClockDial from '@/components/clock-calendar/ClockDial'
import DialTotal from '@/components/clock-calendar/DialTotal'
import { useTimerContext } from '@/contexts/TimerContext'
import { useMinuteNow } from '@/hooks/useMinuteNow'
import { startOfDay } from '@/lib/calendar'
import { entriesToDialArcs, maxDrawableMinute } from '@/lib/clockCalendar'
import type { TimeEntry } from '@/types'

interface TodayDialCardProps {
  entries: TimeEntry[]
}

export default function TodayDialCard({ entries }: TodayDialCardProps) {
  const navigate = useNavigate()
  const { activeEntry } = useTimerContext()
  const minuteNow = useMinuteNow()
  const dayStart = useMemo(() => startOfDay(new Date()), [])

  const completedEntries = useMemo(
    () => entries.filter((entry) => entry.stopped_at !== null),
    [entries]
  )
  const arcs = useMemo(
    () => entriesToDialArcs(completedEntries, dayStart, minuteNow),
    [completedEntries, dayStart, minuteNow]
  )

  const isEmpty = entries.length === 0 && !activeEntry

  return (
    <button
      type="button"
      aria-label="Open today in clock view"
      onClick={() => navigate('/calendar?view=clock')}
      className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/40"
    >
      <div className="mx-auto flex w-full justify-center">
        <ClockDial
          dayStart={dayStart}
          arcs={arcs}
          activeEntry={activeEntry}
          interactive={false}
          size="compact"
          nowMinute={maxDrawableMinute(dayStart, minuteNow)}
          centerPrimary={
            isEmpty ? (
              'Nothing tracked yet today'
            ) : (
              <DialTotal entries={completedEntries} activeEntry={activeEntry} />
            )
          }
        />
      </div>
    </button>
  )
}
