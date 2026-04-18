import { useMemo, useState } from 'react'
import { BarChart2 } from 'lucide-react'
import DailyAreaChart from '@/components/reports/DailyAreaChart'
import DateRangePicker from '@/components/reports/DateRangePicker'
import EntryTable from '@/components/reports/EntryTable'
import FilterBar from '@/components/reports/FilterBar'
import ProjectBarChart from '@/components/reports/ProjectBarChart'
import SummaryBar from '@/components/reports/SummaryBar'
import TagDonutChart from '@/components/reports/TagDonutChart'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjects } from '@/hooks/useProjects'
import { useTags } from '@/hooks/useTags'
import { useTimeEntriesList } from '@/hooks/useTimeEntries'
import { exportToCSV } from '@/lib/utils'

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

function startOfWeek(date) {
  const dayStart = startOfDay(date)
  const day = dayStart.getDay()
  const diff = (day + 6) % 7
  return addDays(dayStart, -diff)
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function buildRange(range, customFrom, customTo) {
  const now = new Date()

  if (range === 'this_week') {
    const from = startOfWeek(now)
    const to = addDays(from, 7)
    return { from: from.toISOString(), to: to.toISOString() }
  }

  if (range === 'last_week') {
    const thisWeekStart = startOfWeek(now)
    const from = addDays(thisWeekStart, -7)
    const to = thisWeekStart
    return { from: from.toISOString(), to: to.toISOString() }
  }

  if (range === 'this_month') {
    const from = startOfMonth(now)
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 1)
    return { from: from.toISOString(), to: to.toISOString() }
  }

  if (range === 'last_month') {
    const thisMonthStart = startOfMonth(now)
    const from = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - 1, 1)
    return { from: from.toISOString(), to: thisMonthStart.toISOString() }
  }

  return { from: customFrom, to: customTo }
}

export default function Reports() {
  const [range, setRange] = useState('this_week')
  const [customFrom, setCustomFrom] = useState(null)
  const [customTo, setCustomTo] = useState(null)
  const [selectedProjectIds, setSelectedProjectIds] = useState([])
  const [selectedTagIds, setSelectedTagIds] = useState([])

  const { from, to } = useMemo(() => buildRange(range, customFrom, customTo), [range, customFrom, customTo])
  const { entries, isLoading, error: entriesError, entryTagsByEntryId } = useTimeEntriesList({ from, to })
  const { projects, error: projectsError } = useProjects()
  const { tags, error: tagsError } = useTags()

  const filteredEntries = useMemo(() => {
    const validProjectIds = new Set(projects.map((project) => project.id))
    const validTagIds = new Set(tags.map((tag) => tag.id))
    const activeProjectIds = selectedProjectIds.filter((id) => validProjectIds.has(id))
    const activeTagIds = selectedTagIds.filter((id) => validTagIds.has(id))
    const hasValidProjectFilter = activeProjectIds.length > 0
    const hasValidTagFilter = activeTagIds.length > 0
    const activeTagIdSet = new Set(activeTagIds)

    return entries
      .filter((entry) => {
        if (hasValidProjectFilter && !activeProjectIds.includes(entry.project_id)) {
          return false
        }

        if (!hasValidTagFilter) {
          return true
        }

        const entryTags = entryTagsByEntryId[entry.id] ?? []
        return entryTags.some((tag) => activeTagIdSet.has(tag.id))
      })
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
  }, [entries, selectedProjectIds, selectedTagIds, entryTagsByEntryId, projects, tags])

  const handleToggleProject = (projectId) => {
    setSelectedProjectIds((previous) =>
      previous.includes(projectId)
        ? previous.filter((id) => id !== projectId)
        : [...previous, projectId]
    )
  }

  const handleToggleTag = (tagId) => {
    setSelectedTagIds((previous) =>
      previous.includes(tagId) ? previous.filter((id) => id !== tagId) : [...previous, tagId]
    )
  }

  const handleApplyCustom = (nextFrom, nextTo) => {
    setCustomFrom(nextFrom)
    setCustomTo(nextTo)
  }

  const canExport = filteredEntries.length > 0 && Boolean(from && to)

  return (
    <section className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Reports</h1>
        <Button
          type="button"
          variant="outline"
          onClick={() => exportToCSV(filteredEntries, entryTagsByEntryId, from, to)}
          disabled={!canExport}
          className="rounded-lg border-border transition-colors duration-150"
        >
          Export CSV
        </Button>
      </header>

      <DateRangePicker
        range={range}
        customFrom={customFrom}
        customTo={customTo}
        onRangeChange={setRange}
        onApplyCustom={handleApplyCustom}
      />

      {entriesError || projectsError || tagsError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {entriesError?.message ?? projectsError?.message ?? tagsError?.message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <SummaryBar entries={filteredEntries} />

          <FilterBar
            projects={projects}
            tags={tags}
            selectedProjectIds={selectedProjectIds}
            selectedTagIds={selectedTagIds}
            onToggleProject={handleToggleProject}
            onToggleTag={handleToggleTag}
            onResetProjects={() => setSelectedProjectIds([])}
            onResetTags={() => setSelectedTagIds([])}
          />

          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              <h2 className="mb-4 text-sm font-medium text-muted-foreground">
                Hours by project
              </h2>
              <ProjectBarChart entries={filteredEntries} />
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              <h2 className="mb-4 text-sm font-medium text-muted-foreground">
                Hours by tag
              </h2>
              <TagDonutChart entries={filteredEntries} entryTagsMap={entryTagsByEntryId} tags={tags} />
            </section>
          </div>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">
              Hours by day
            </h2>
            <DailyAreaChart entries={filteredEntries} from={from} to={to} />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Entries</h2>
            {filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <BarChart2 className="mb-2 h-8 w-8 text-muted-foreground/70" />
                <p className="text-sm text-muted-foreground/70">Nothing tracked in this period.</p>
              </div>
            ) : (
              <EntryTable entries={filteredEntries} entryTagsMap={entryTagsByEntryId} />
            )}
          </section>
        </>
      )}
    </section>
  )
}
