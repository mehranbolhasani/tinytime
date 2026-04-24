import { ResponsiveBar } from '@nivo/bar'
import ChartTooltip from '@/components/reports/ChartTooltip'
import { hexToRgba } from '@/lib/color'
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

function getSoftProjectColor(color) {
  if (typeof color === 'string' && color.startsWith('#')) {
    return hexToRgba(color, 0.78)
  }

  return 'color-mix(in oklab, var(--muted-foreground) 72%, var(--card) 28%)'
}

export default function ProjectBarChart({ entries }) {
  const data = buildProjectData(entries)

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground/70">No project data for selected filters.</p>
  }

  const chartHeight = Math.max(260, data.length * 52)
  const effectiveHeight = Math.min(chartHeight, 560)

  return (
    <div className="h-[320px] w-full overflow-y-auto md:h-[360px]">
      <div className="min-h-[260px]" style={{ height: effectiveHeight }}>
        <ResponsiveBar
          data={data}
          keys={['hours']}
          indexBy="name"
          layout="horizontal"
          margin={{ top: 8, right: 18, bottom: 28, left: 108 }}
          padding={0.32}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={({ data: item }) => getSoftProjectColor(item.color)}
          borderRadius={6}
          borderWidth={0}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            format: (value) => `${value}h`,
            tickValues: 5,
            legend: '',
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 10,
            tickRotation: 0,
            truncateTickAt: 18,
          }}
          enableGridX
          enableGridY={false}
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
          label={(bar) => formatDuration(bar.data.seconds ?? 0)}
          labelSkipWidth={72}
          labelSkipHeight={18}
          labelTextColor="color-mix(in oklab, var(--foreground) 80%, var(--card) 20%)"
          tooltip={({ data: item }) => (
            <ChartTooltip
              title={item.name}
              lines={[formatDuration(item.seconds), `${item.hours.toFixed(1)}h total`]}
            />
          )}
          role="application"
          ariaLabel="Hours by project chart"
          motionConfig="gentle"
        />
      </div>
    </div>
  )
}
