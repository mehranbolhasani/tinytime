import { Bar } from 'recharts/es6/cartesian/Bar'
import { CartesianGrid } from 'recharts/es6/cartesian/CartesianGrid'
import { XAxis } from 'recharts/es6/cartesian/XAxis'
import { YAxis } from 'recharts/es6/cartesian/YAxis'
import { BarChart } from 'recharts/es6/chart/BarChart'
import { Cell } from 'recharts/es6/component/Cell'
import { LabelList } from 'recharts/es6/component/LabelList'
import { ResponsiveContainer } from 'recharts/es6/component/ResponsiveContainer'
import { Tooltip } from 'recharts/es6/component/Tooltip'
import { CHART_TOOLTIP_STYLE } from '@/lib/chart'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { formatDuration } from '@/lib/utils'

function buildProjectData(entries) {
  const buckets = entries.reduce((map, entry) => {
    const key = entry.project_id ?? 'no-project'
    if (!map[key]) {
      map[key] = {
        id: key,
        name: entry.projects?.name ?? 'No project',
        color: entry.projects?.color ?? 'var(--muted-foreground)',
        seconds: 0,
      }
    }

    map[key].seconds += entry.duration_seconds ?? 0
    return map
  }, {})

  return Object.values(buckets)
    .sort((a, b) => b.seconds - a.seconds)
    .map((item) => ({
      ...item,
      hours: Math.round((item.seconds / 3600) * 10) / 10,
    }))
}

function DurationLabel({ x = 0, y = 0, width = 0, height = 0, index, data }) {
  const item = data[index]
  if (!item) {
    return null
  }

  return (
    <text x={x + width + 8} y={y + height / 2 + 4} fontSize={12} fill="var(--muted-foreground)">
      {formatDuration(item.seconds)}
    </text>
  )
}

const AXIS_TICK_STYLE = { fontSize: 12, fill: 'var(--muted-foreground)' }

export default function ProjectBarChart({ entries }) {
  const isMobile = useMediaQuery('(max-width: 639px)')
  const data = buildProjectData(entries)

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground/70">No project data for selected filters.</p>
  }

  const chartHeight = Math.max(260, data.length * 52)
  const effectiveHeight = isMobile ? Math.min(chartHeight, 480) : chartHeight

  return (
    <div className="h-[320px] w-full overflow-y-auto md:h-[360px]">
      <div className="min-h-[260px]" style={{ height: effectiveHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 12, right: isMobile ? 56 : 96, top: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" tickFormatter={(value) => `${value}h`} tick={AXIS_TICK_STYLE} />
            <YAxis dataKey="name" type="category" width={isMobile ? 96 : 120} tick={AXIS_TICK_STYLE} />
            <Tooltip
              formatter={(value, _name, payload) => [formatDuration(payload.payload.seconds), 'Duration']}
              labelFormatter={(value) => value}
              contentStyle={CHART_TOOLTIP_STYLE}
            />
            <Bar dataKey="hours" isAnimationActive={false} radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="hours"
                content={(props) => <DurationLabel {...props} data={data} />}
              />
              {data.map((item) => (
                <Cell key={item.id} fill={item.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
