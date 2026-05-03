import { formatDuration } from '@/lib/utils'

function buildProjectBuckets(entries) {
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

  return Object.values(buckets).sort((a, b) => b.seconds - a.seconds)
}

export default function ProjectBreakdown({ entries }) {
  const rows = buildProjectBuckets(entries)

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground/70">No project data for selected filters.</p>
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.id} className="rounded-xl bg-card p-3">
          <p className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground/50">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
              aria-hidden
            />
            <span className="min-w-0 truncate">{row.name}</span>
          </p>
          <div className="text-xl font-medium tracking-tight text-foreground tabular-nums">
            {formatDuration(row.seconds)}
          </div>
        </div>
      ))}
    </div>
  )
}
