import { PieChart } from 'recharts/es6/chart/PieChart'
import { Cell } from 'recharts/es6/component/Cell'
import { ResponsiveContainer } from 'recharts/es6/component/ResponsiveContainer'
import { Tooltip } from 'recharts/es6/component/Tooltip'
import { Pie } from 'recharts/es6/polar/Pie'
import { formatDuration } from '@/lib/utils'

const UNTAGGED_COLOR = '#94a3b8'

const TOOLTIP_STYLE = {
  borderRadius: '10px',
  border: '1px solid var(--border)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  backgroundColor: 'var(--card)',
}

function buildTagData(entries, entryTagsMap) {
  const buckets = {}
  let untaggedSeconds = 0

  entries.forEach((entry) => {
    const seconds = entry.duration_seconds ?? 0
    const tags = entryTagsMap[entry.id] ?? []

    if (tags.length === 0) {
      untaggedSeconds += seconds
      return
    }

    tags.forEach((tag) => {
      if (!buckets[tag.id]) {
        buckets[tag.id] = {
          id: tag.id,
          name: tag.name,
          color: tag.color,
          seconds: 0,
        }
      }
      buckets[tag.id].seconds += seconds
    })
  })

  const data = Object.values(buckets).sort((a, b) => b.seconds - a.seconds)
  if (untaggedSeconds > 0) {
    data.push({
      id: 'untagged',
      name: 'Untagged',
      color: UNTAGGED_COLOR,
      seconds: untaggedSeconds,
    })
  }

  return data
}

export default function TagDonutChart({ entries, entryTagsMap, tags }) {
  if (tags.length === 0) {
    return <p className="text-sm text-muted-foreground/70">No tags used in this period.</p>
  }

  const data = buildTagData(entries, entryTagsMap)
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground/70">No tag data for selected filters.</p>
  }

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="seconds"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              isAnimationActive={false}
            >
              {data.map((item) => (
                <Cell key={item.id} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatDuration(Number(value) || 0)}
              contentStyle={TOOLTIP_STYLE}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-2">
        {data.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-foreground">{item.name}</span>
            </span>
            <span className="font-mono font-medium text-muted-foreground">{formatDuration(item.seconds)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
