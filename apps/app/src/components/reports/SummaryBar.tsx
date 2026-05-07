import { cn, formatDuration } from '@/lib/utils'
import type { TimeEntry } from '@/types'

interface ProjectDuration {
  seconds: number
  name: string
  color: string
}

function getDateKey(dateInput: string): string | null {
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function calculateSummary(entries: TimeEntry[]) {
  if (entries.length === 0) {
    return null
  }

  const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration_seconds ?? 0), 0)
  const dayKeys = new Set(entries.map((entry) => getDateKey(entry.started_at)).filter(Boolean))
  const trackedDays = dayKeys.size
  const dailyAverage = trackedDays > 0 ? Math.round(totalSeconds / trackedDays) : 0

  const projectDurations = entries.reduce<Record<string, ProjectDuration>>((map, entry) => {
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

  const topProject =
    (Object.values(projectDurations).sort((a, b) => b.seconds - a.seconds)[0] as ProjectDuration | undefined) ??
    null

  return { totalSeconds, trackedDays, dailyAverage, topProject }
}

interface StatCardProps {
  label: string
  value: React.ReactNode
  variant?: 'default' | 'rich'
}

function StatCard({ label, value, variant = 'default' }: StatCardProps) {
  return (
    <div className="rounded-xl bg-card p-3">
      <p className="mb-1 text-xs font-medium tracking-normal text-muted-foreground/50">{label}</p>
      <div
        className={cn(
          'text-foreground',
          variant === 'default' && 'text-xl font-medium tracking-tight tabular-nums',
          variant === 'rich' && 'text-base font-normal'
        )}
      >
        {value}
      </div>
    </div>
  )
}

interface SummaryBarProps {
  entries: TimeEntry[]
}

export default function SummaryBar({ entries }: SummaryBarProps) {
  const summary = calculateSummary(entries)

  if (!summary) {
    return (
      <section className="grid gap-2 sm:grid-cols-2">
        <StatCard label="Total time" value="—" />
        <StatCard label="Tracked days" value="—" />
        <StatCard label="Daily average" value="—" />
        <StatCard label="Top project" value="—" />
      </section>
    )
  }

  const topProjectValue = summary.topProject ? (
    <div className="space-y-1">
      <span className="flex min-w-0 items-center gap-2 text-base leading-snug">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: summary.topProject.color }}
          aria-hidden
        />
        <span className="min-w-0 truncate">{summary.topProject.name}</span>
      </span>
      <div className="text-sm font-normal tabular-nums text-muted-foreground">
        {formatDuration(summary.topProject.seconds)}
      </div>
    </div>
  ) : (
    '—'
  )

  return (
    <section className="grid gap-2 sm:grid-cols-2">
      <StatCard label="Total time" value={formatDuration(summary.totalSeconds)} />
      <StatCard label="Tracked days" value={summary.trackedDays} />
      <StatCard label="Daily average" value={formatDuration(summary.dailyAverage)} />
      <StatCard label="Top project" value={topProjectValue} variant="rich" />
    </section>
  )
}
