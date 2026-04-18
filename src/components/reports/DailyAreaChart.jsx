import { Area } from 'recharts/es6/cartesian/Area'
import { CartesianGrid } from 'recharts/es6/cartesian/CartesianGrid'
import { XAxis } from 'recharts/es6/cartesian/XAxis'
import { YAxis } from 'recharts/es6/cartesian/YAxis'
import { AreaChart } from 'recharts/es6/chart/AreaChart'
import { ResponsiveContainer } from 'recharts/es6/component/ResponsiveContainer'
import { Tooltip } from 'recharts/es6/component/Tooltip'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { CHART_TOOLTIP_STYLE } from '@/lib/chart'
import { formatDuration } from '@/lib/utils'

const AREA_COLOR = 'var(--chart-1)'

const AXIS_TICK_STYLE = { fontSize: 12, fill: 'var(--muted-foreground)' }

function parseDateInput(dateInput) {
  if (!dateInput) {
    return null
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateInput))
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const parsed = new Date(dateInput)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

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

function getDateKey(dateInput) {
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildDailyData(entries, from, to) {
  const start = parseDateInput(from)
  const end = parseDateInput(to)
  if (!start || !end || start >= end) {
    return []
  }

  const dailySeconds = entries.reduce((map, entry) => {
    const key = getDateKey(entry.started_at)
    if (!key) {
      return map
    }
    map[key] = (map[key] ?? 0) + (entry.duration_seconds ?? 0)
    return map
  }, {})

  const rows = []
  let cursor = startOfDay(start)
  const endDay = startOfDay(end)

  while (cursor < endDay) {
    const key = getDateKey(cursor)
    const seconds = dailySeconds[key] ?? 0
    rows.push({
      dateKey: key,
      label: cursor.toLocaleDateString([], { weekday: 'short', day: 'numeric' }),
      seconds,
      hours: Math.round((seconds / 3600) * 10) / 10,
    })
    cursor = addDays(cursor, 1)
  }

  return rows
}

export default function DailyAreaChart({ entries, from, to }) {
  const isMobile = useMediaQuery('(max-width: 639px)')
  const data = buildDailyData(entries, from, to)

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground/70">No day data for selected range.</p>
  }

  const rotateTicks = !isMobile && data.length > 10

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: rotateTicks ? 44 : 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            interval={isMobile ? 'preserveStartEnd' : 0}
            angle={rotateTicks ? -45 : 0}
            textAnchor={rotateTicks ? 'end' : 'middle'}
            height={rotateTicks ? 56 : 30}
            tick={AXIS_TICK_STYLE}
          />
          <YAxis tickFormatter={(value) => `${value}h`} tick={AXIS_TICK_STYLE} />
          <Tooltip
            formatter={(value, _name, payload) => [formatDuration(payload.payload.seconds), 'Duration']}
            contentStyle={CHART_TOOLTIP_STYLE}
          />
          <Area
            type="monotone"
            dataKey="hours"
            stroke={AREA_COLOR}
            fill={AREA_COLOR}
            fillOpacity={0.15}
            isAnimationActive={false}
            dot={{ r: 3, fill: AREA_COLOR }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
