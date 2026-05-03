import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ClipboardList } from 'lucide-react'
import DateRangePicker from '@/components/reports/DateRangePicker'
import EntryTable from '@/components/reports/EntryTable'
import FilterBar from '@/components/reports/FilterBar'
import ProjectBreakdown from '@/components/reports/ProjectBreakdown'
import SummaryBar from '@/components/reports/SummaryBar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjects } from '@/hooks/useProjects'
import { useTimeEntriesList } from '@/hooks/useTimeEntries'
import { presets } from '@/lib/motion'
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

  const { from, to } = useMemo(() => buildRange(range, customFrom, customTo), [range, customFrom, customTo])
  const { entries, isLoading, error: entriesError } = useTimeEntriesList({ from, to })
  const { projects, error: projectsError } = useProjects()

  const filteredEntries = useMemo(() => {
    const completedEntries = entries.filter((entry) => entry.stopped_at !== null)
    const validProjectIds = new Set(projects.map((project) => project.id))
    const activeProjectIds = selectedProjectIds.filter((id) => validProjectIds.has(id))
    const hasValidProjectFilter = activeProjectIds.length > 0

    return completedEntries
      .filter((entry) => {
        if (hasValidProjectFilter && !activeProjectIds.includes(entry.project_id)) {
          return false
        }
        return true
      })
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
  }, [entries, selectedProjectIds, projects])

  const handleToggleProject = (projectId) => {
    setSelectedProjectIds((previous) =>
      previous.includes(projectId)
        ? previous.filter((id) => id !== projectId)
        : [...previous, projectId]
    )
  }

  const handleApplyCustom = (nextFrom, nextTo) => {
    setCustomFrom(nextFrom)
    setCustomTo(nextTo)
  }

  const canExport = filteredEntries.length > 0 && Boolean(from && to)

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-pixel font-bold text-foreground tracking-tighter">Reports</h1>
        <Button
          type="button"
          variant="outline"
          onClick={() => exportToCSV(filteredEntries, from, to)}
          disabled={!canExport}
          className="h-8 rounded-md border-border text-sm transition-colors duration-150"
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

      {entriesError || projectsError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {entriesError?.message ?? projectsError?.message}
        </div>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div
            key="reports-loading"
            variants={presets.panelSwap.variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={presets.panelSwap.transition}
            className="space-y-3 rounded-xl bg-card p-4"
          >
            <Skeleton className="h-4 w-40" />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Skeleton className="h-[4.25rem] w-full rounded-xl" />
              <Skeleton className="h-[4.25rem] w-full rounded-xl" />
              <Skeleton className="h-[4.25rem] w-full rounded-xl" />
              <Skeleton className="h-[4.25rem] w-full rounded-xl" />
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
          </motion.div>
        ) : (
          <motion.div
            key="reports-content"
            variants={presets.panelSwap.variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={presets.panelSwap.transition}
            className="space-y-3"
          >
            <motion.div className="space-y-3">
              <SummaryBar entries={filteredEntries} />

              <section className="rounded-xl bg-card p-4">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <h2 className="text-sm font-medium text-muted-foreground">Time by project</h2>
                  <FilterBar
                    projects={projects}
                    selectedProjectIds={selectedProjectIds}
                    onToggleProject={handleToggleProject}
                    onResetProjects={() => setSelectedProjectIds([])}
                  />
                </div>
                <ProjectBreakdown entries={filteredEntries} />
              </section>
            </motion.div>

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Entries</h2>
              {filteredEntries.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <ClipboardList className="mb-2 h-8 w-8 text-muted-foreground/70" />
                  <p className="text-sm text-muted-foreground/70">Nothing tracked in this period.</p>
                </div>
              ) : (
                <EntryTable entries={filteredEntries} />
              )}
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
