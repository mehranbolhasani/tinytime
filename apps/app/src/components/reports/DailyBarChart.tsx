import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { toSafeHexColor } from '@/lib/color'
import { formatDuration } from '@/lib/utils'
import type { TimeEntry } from '@/types'

const NO_PROJECT_KEY = 'no-project'
const NO_PROJECT_COLOR = '#94a3b8'

interface ProjectMeta {
  id: string
  name: string
  color: string
}

type DayBucket = {
  dateKey: string
  [projectId: string]: number | string
}

function getDateKey(dateInput: string): string | null {
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTickLabel(key: string): string {
  const date = new Date(key + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return key
  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric' })
}

function formatTooltipDate(key: string): string {
  const date = new Date(key + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return key
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

function buildChartData(entries: TimeEntry[]): { data: DayBucket[]; projects: ProjectMeta[] } {
  const projectMap = new Map<string, ProjectMeta>()
  const dayMap = new Map<string, DayBucket>()

  for (const entry of entries) {
    const dateKey = getDateKey(entry.started_at)
    if (!dateKey) continue

    const projectKey = entry.project_id ?? NO_PROJECT_KEY
    const seconds = entry.duration_seconds ?? 0

    if (!projectMap.has(projectKey)) {
      projectMap.set(projectKey, {
        id: projectKey,
        name: entry.projects?.name ?? 'No project',
        color: toSafeHexColor(entry.projects?.color, NO_PROJECT_COLOR),
      })
    }

    let bucket = dayMap.get(dateKey)
    if (!bucket) {
      bucket = { dateKey }
      dayMap.set(dateKey, bucket)
    }

    const current = (bucket[projectKey] as number) ?? 0
    bucket[projectKey] = current + seconds
  }

  const data = Array.from(dayMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  const projects = Array.from(projectMap.values())

  return { data, projects }
}

interface TooltipPayloadEntry {
  dataKey: string
  value: number
  color: string
  name?: string
}

interface CustomTooltipProps {
  active?: boolean
  label?: string
  payload?: TooltipPayloadEntry[]
}

function CustomTooltip({ active, label, payload }: CustomTooltipProps) {
  if (!active || !payload || !label) return null

  const dateLabel = formatTooltipDate(label)

  return (
    <div className="rounded-xl border border-border/50 bg-card/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{dateLabel}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-6 text-xs">
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden
              />
              <span className="text-foreground">{entry.name ?? entry.dataKey}</span>
            </span>
            <span className="tabular-nums font-medium text-foreground">{formatDuration(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface DailyBarChartProps {
  entries: TimeEntry[]
}

export default function DailyBarChart({ entries }: DailyBarChartProps) {
  if (entries.length === 0) return null

  const { data, projects } = buildChartData(entries)

  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barCategoryGap="20%" margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="dateKey"
          tickFormatter={formatTickLabel}
          tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          dy={8}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(148, 163, 184, 0.06)', radius: 6 }}
        />
        {projects.map((project, index) => (
          <Bar
            key={project.id}
            dataKey={project.id}
            name={project.name}
            stackId="a"
            fill={project.color}
            radius={index === projects.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
