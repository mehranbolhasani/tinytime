import { ResponsiveLine } from '@nivo/line'
import ChartTooltip from '@/components/reports/ChartTooltip'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { formatDuration } from '@/lib/utils'

const LINE_COLOR = 'var(--primary)'

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
  const rows = buildDailyData(entries, from, to)

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground/70">No day data for selected range.</p>
  }

  const chartData = [
    {
      id: 'Hours',
      data: rows.map((item) => ({
        x: item.label,
        y: item.hours,
        seconds: item.seconds,
      })),
    },
  ]

  const rotateTicks = !isMobile && rows.length > 10

  return (
    <div className="h-[320px] w-full">
      <ResponsiveLine
        data={chartData}
        margin={{ top: 8, right: 12, bottom: rotateTicks ? 56 : 28, left: 40 }}
        xScale={{ type: 'point' }}
        yScale={{ type: 'linear', min: 0, max: 'auto', stacked: false, reverse: false }}
        curve="catmullRom"
        defs={[
          {
            id: 'lineGradient',
            type: 'linearGradient',
            colors: [
              { offset: 0, color: LINE_COLOR, opacity: 0.2 },
              { offset: 100, color: LINE_COLOR, opacity: 0.02 },
            ],
          },
        ]}
        fill={[{ match: '*', id: 'lineGradient' }]}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: rotateTicks ? -45 : 0,
          truncateTickAt: isMobile ? 6 : 12,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          format: (value) => `${value}h`,
          tickValues: 5,
        }}
        enablePoints
        pointSize={5}
        pointBorderWidth={1.5}
        pointBorderColor="var(--card)"
        pointColor={LINE_COLOR}
        lineWidth={2}
        enableArea
        areaOpacity={1}
        colors={[LINE_COLOR]}
        enableGridX={false}
        enableGridY
        useMesh
        theme={{
          axis: {
            ticks: {
              text: {
                fill: 'var(--muted-foreground)',
                fontSize: 11,
              },
            },
          },
          grid: {
            line: {
              stroke: 'color-mix(in oklab, var(--border) 78%, transparent)',
              strokeDasharray: '2 4',
            },
          },
          crosshair: {
            line: {
              stroke: 'color-mix(in oklab, var(--border) 90%, var(--foreground) 10%)',
              strokeWidth: 1,
            },
          },
          tooltip: {
            container: {
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--foreground)',
              boxShadow: '0 8px 20px color-mix(in oklab, var(--foreground) 8%, transparent)',
            },
          },
        }}
        tooltip={({ point }) => {
          const rawSeconds =
            point.data.seconds ??
            point.data.data?.seconds ??
            Math.round((Number(point.data.y) || 0) * 3600)

          return (
            <ChartTooltip title={point.data.xFormatted} lines={[formatDuration(rawSeconds)]} />
          )
        }}
        role="application"
        ariaLabel="Hours by day chart"
        motionConfig="gentle"
      />
    </div>
  )
}
