import { useMemo } from 'react'
import { distributeAcrossHours } from '@/lib/reports'
import { formatDuration } from '@/lib/utils'
import type { TimeEntry } from '@/types'

interface ActivityHeatmapProps {
  entries: TimeEntry[]
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function buildGrid(entries: TimeEntry[]): {
  grid: number[][]
  maxSeconds: number
  hasLateHours: boolean
} {
  const grid: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0))
  let hasLateHours = false

  for (const entry of entries) {
    const start = new Date(entry.started_at)
    const end = entry.stopped_at ? new Date(entry.stopped_at) : new Date()

    for (const slice of distributeAcrossHours(start, end)) {
      grid[slice.hour][slice.weekday] += slice.seconds
      if (slice.hour <= 5) {
        hasLateHours = true
      }
    }
  }

  const maxSeconds = Math.max(...grid.flat(), 0)

  return { grid, maxSeconds, hasLateHours }
}

export default function ActivityHeatmap({ entries }: ActivityHeatmapProps) {
  const { grid, maxSeconds, hasLateHours } = useMemo(() => buildGrid(entries), [entries])

  if (entries.length === 0) return null

  const hours = hasLateHours
    ? Array.from({ length: 24 }, (_, i) => i)
    : Array.from({ length: 18 }, (_, i) => i + 6)

  return (
    <div>
      <div className="grid grid-cols-[2rem_repeat(7,_1fr)] mb-1">
        <div />
        {DAYS.map((day) => (
          <div key={day} className="text-center text-[10px] text-muted-foreground/60">
            {day}
          </div>
        ))}
      </div>
      {hours.map((hour) => (
        <div key={hour} className="grid grid-cols-[2rem_repeat(7,_1fr)] gap-px mb-px">
          <div className="text-right pr-1 text-[10px] text-muted-foreground/50 leading-4">
            {hour % 3 === 0 ? `${String(hour).padStart(2, '0')}` : ''}
          </div>
          {DAYS.map((day, weekday) => {
            const seconds = grid[hour]?.[weekday] ?? 0
            const intensity = maxSeconds > 0 ? seconds / maxSeconds : 0
            const percent = Math.round((0.14 + intensity * 0.76) * 100)
            return (
              <div
                key={day}
                role={seconds > 0 ? 'img' : undefined}
                aria-label={seconds > 0 ? `${day} ${hour}:00, ${formatDuration(seconds)}` : undefined}
                className="h-4 rounded-[2px]"
                style={{
                  backgroundColor:
                    intensity > 0
                      ? `color-mix(in oklab, var(--primary) ${percent}%, transparent)`
                      : 'transparent',
                  border: '0.5px solid var(--color-border, rgba(0,0,0,0.06))',
                }}
                title={seconds > 0 ? formatDuration(seconds) : undefined}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
