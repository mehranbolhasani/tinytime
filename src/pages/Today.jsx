import EntryList from '@/components/timer/EntryList'
import TimerWidget from '@/components/timer/TimerWidget'
import { useTimeEntries } from '@/hooks/useTimeEntries'

function getDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getHeadingDate(date) {
  return date.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function Today() {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const from = getDateKey(today)
  const to = getDateKey(tomorrow)

  const { entries, isLoading, error, createEntry, stopEntry, deleteEntry, activeEntry, entryTagsByEntryId } =
    useTimeEntries({
      from,
      to,
    })

  const completedEntries = entries.filter((entry) => entry.stopped_at !== null)

  return (
    <section className="space-y-4">
      <header className="pb-0">
        <h1 className="text-lg font-normal tracking-tight text-foreground">{getHeadingDate(today)}</h1>
      </header>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}

      <TimerWidget
        activeEntry={activeEntry}
        createEntry={createEntry}
        stopEntry={stopEntry}
        isEntriesLoading={isLoading}
      />

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground/70">
          Loading time entries...
        </div>
      ) : (
        <EntryList entries={completedEntries} deleteEntry={deleteEntry} entryTagsByEntryId={entryTagsByEntryId} />
      )}
    </section>
  )
}
