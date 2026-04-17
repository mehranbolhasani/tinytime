import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDuration } from '@/lib/utils'

function buildProjectData(entries) {
  const buckets = entries.reduce((map, entry) => {
    const key = entry.project_id ?? 'no-project'
    if (!map[key]) {
      map[key] = {
        id: key,
        name: entry.projects?.name ?? 'No project',
        color: entry.projects?.color ?? '#94a3b8',
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

const TOOLTIP_STYLE = {
  borderRadius: '10px',
  border: '1px solid var(--border)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  backgroundColor: 'var(--card)',
}

const AXIS_TICK_STYLE = { fontSize: 12, fill: 'var(--muted-foreground)' }

export default function ProjectBarChart({ entries }) {
  const data = buildProjectData(entries)

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground/70">No project data for selected filters.</p>
  }

  const chartHeight = Math.max(260, data.length * 52)

  return (
    <div className="h-[320px] min-h-[320px] w-full md:h-[360px]" style={{ minHeight: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 96, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis type="number" tickFormatter={(value) => `${value}h`} tick={AXIS_TICK_STYLE} />
          <YAxis dataKey="name" type="category" width={120} tick={AXIS_TICK_STYLE} />
          <Tooltip
            formatter={(value, _name, payload) => [formatDuration(payload.payload.seconds), 'Duration']}
            labelFormatter={(value) => value}
            contentStyle={TOOLTIP_STYLE}
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
  )
}
