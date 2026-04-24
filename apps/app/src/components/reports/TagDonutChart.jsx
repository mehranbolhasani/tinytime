import { ResponsivePie } from '@nivo/pie'
import ChartTooltip from '@/components/reports/ChartTooltip'
import { hexToRgba } from '@/lib/color'
import { formatDuration } from '@/lib/utils'

const UNTAGGED_COLOR = 'color-mix(in oklab, var(--muted-foreground) 72%, var(--card) 28%)'

function getSoftTagColor(color) {
  if (typeof color === 'string' && color.startsWith('#')) {
    return hexToRgba(color, 0.78)
  }

  return UNTAGGED_COLOR
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
  const totalSeconds = data.reduce((sum, item) => sum + item.seconds, 0)

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <div className="h-[260px]">
        <ResponsivePie
          data={data}
          id="name"
          value="seconds"
          colors={({ data: item }) => getSoftTagColor(item.color)}
          margin={{ top: 12, right: 12, bottom: 12, left: 12 }}
          innerRadius={0.62}
          padAngle={1.2}
          cornerRadius={6}
          activeOuterRadiusOffset={4}
          borderWidth={0}
          enableArcLabels={false}
          enableArcLinkLabels={false}
          layers={[
            'arcs',
            'arcLabels',
            'arcLinkLabels',
            'legends',
            ({ centerX, centerY }) => (
              <g>
                <text
                  x={centerX}
                  y={centerY - 4}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  Total
                </text>
                <text
                  x={centerX}
                  y={centerY + 16}
                  textAnchor="middle"
                  className="fill-foreground text-[11px] font-medium"
                >
                  {formatDuration(totalSeconds)}
                </text>
              </g>
            ),
          ]}
          tooltip={({ datum }) => (
            <ChartTooltip
              title={String(datum.id)}
              lines={[formatDuration(Number(datum.value) || 0)]}
            />
          )}
          theme={{
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
          role="application"
          ariaLabel="Hours by tag chart"
          motionConfig="gentle"
        />
      </div>

      <ul className="space-y-1.5">
        {data.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 text-sm">
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
