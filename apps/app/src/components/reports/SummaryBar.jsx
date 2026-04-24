import { formatDuration } from '@/lib/utils'

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

function calculateSummary(entries) {
  if (entries.length === 0) {
    return null
  }

  const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration_seconds ?? 0), 0)
  const dayKeys = new Set(entries.map((entry) => getDateKey(entry.started_at)).filter(Boolean))
  const trackedDays = dayKeys.size
  const dailyAverage = trackedDays > 0 ? Math.round(totalSeconds / trackedDays) : 0

  const projectDurations = entries.reduce((map, entry) => {
    const key = entry.project_id ?? 'no-project'
    if (!map[key]) {
      map[key] = {
        seconds: 0,
        name: entry.projects?.name ?? 'No project',
        color: entry.projects?.color ?? 'var(--muted-foreground)',
      }
    }

    map[key].seconds += entry.duration_seconds ?? 0
    return map
  }, {})

  const topProject = Object.values(projectDurations).sort((a, b) => b.seconds - a.seconds)[0] ?? null

  return {
    totalSeconds,
    trackedDays,
    dailyAverage,
    topProject,
  }
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl bg-card p-4">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">{label}</p>
      <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
    </div>
  )
}

export default function SummaryBar({ entries }) {
  const summary = calculateSummary(entries)

  if (!summary) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        <StatCard label="Total time" value="—" />
        <StatCard label="Tracked days" value="—" />
        <StatCard label="Daily average" value="—" />
        <StatCard label="Top project" value="—" />
      </section>
    )
  }

  const topProjectValue = summary.topProject ? (
    <span className="inline-flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: summary.topProject.color }} />
      {summary.topProject.name}
    </span>
  ) : (
    '—'
  )

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
      <StatCard label="Total time" value={formatDuration(summary.totalSeconds)} />
      <StatCard label="Tracked days" value={summary.trackedDays} />
      <StatCard label="Daily average" value={formatDuration(summary.dailyAverage)} />
      <StatCard label="Top project" value={topProjectValue} />
    </section>
  )
}
