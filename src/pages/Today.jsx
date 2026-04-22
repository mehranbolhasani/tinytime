import EntryList from '@/components/timer/EntryList'
import TimerWidget from '@/components/timer/TimerWidget'
import { Skeleton } from '@/components/ui/skeleton'
import { useTimeEntriesList, useTimeEntryMutations } from '@/hooks/useTimeEntries'
import { localDayRange } from '@/lib/utils'

export default function Today() {
  const today = new Date()
  const { from, to } = localDayRange(today)

  const { entries, isLoading, error, entryTagsByEntryId } = useTimeEntriesList({ from, to })
  const { createEntry, stopEntry, deleteEntry } = useTimeEntryMutations({ entries })

  const completedEntries = entries.filter((entry) => entry.stopped_at !== null)

  return (
    <section className="space-y-3">

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}

      <TimerWidget
        createEntry={createEntry}
        stopEntry={stopEntry}
        isEntriesLoading={isLoading}
      />

      {isLoading ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-[0px_1px_0px_rgba(0,0,0,0.05)]">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <EntryList entries={completedEntries} deleteEntry={deleteEntry} entryTagsByEntryId={entryTagsByEntryId} />
      )}
    </section>
  )
}
