import FloatingAlerts, { FloatingAlert } from '@/components/layout/FloatingAlerts'
import PageShell from '@/components/layout/PageShell'
import EntryList, { EntryListSkeleton } from '@/components/timer/EntryList'
import TimerWidget from '@/components/timer/TimerWidget'
import TodayDialCard from '@/components/timer/TodayDialCard'
import { useFavouriteEntries } from '@/hooks/useFavouriteEntries'
import { useLocalDay } from '@/hooks/useLocalDay'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useTimeEntriesList, useTimeEntryMutations } from '@/hooks/useTimeEntries'
import { useTimerControlActions } from '@/hooks/useTimerControlActions'
import { DESKTOP_MEDIA_QUERY } from '@/lib/breakpoints'
import { localDayRange } from '@/lib/dates'
import type { TimeEntry } from '@/types'

export default function Today() {
  const today = useLocalDay()
  const { from, to } = localDayRange(today)

  const { entries, isLoading, error } = useTimeEntriesList({ from: from ?? undefined, to: to ?? undefined })
  const { deleteEntry } = useTimeEntryMutations({ entries })
  const { startTimer } = useTimerControlActions()
  const { addFavourite, removeFavourite, isFavourite } = useFavouriteEntries()
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY)

  const handleContinueEntry = (entry: TimeEntry) => {
    void startTimer({
      projectId: entry.project_id,
      description: entry.description ?? '',
    })
  }

  const completedEntries = entries.filter((entry) => entry.stopped_at !== null)

  return (
    <PageShell
      title="Today"
      subtitle={today.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
      contentClassName="relative flex flex-col md:flex-row md:rounded-r-none"
    >
      <FloatingAlerts>
        {error ? <FloatingAlert>{error.message}</FloatingAlert> : null}
      </FloatingAlerts>

      <TimerWidget isEntriesLoading={isLoading} />

      <div className="flex flex-col gap-4 rounded-t-2xl bg-transparent md:bg-indigo-100 p-4 md:justify-between md:gap-0 md:rounded-none md:rounded-l-2xl pt-12 md:pt-0">
        {isDesktop ? <TodayDialCard entries={entries} isLoading={isLoading} /> : null}

        {isLoading ? (
          <EntryListSkeleton />
        ) : (
          <EntryList
            entries={completedEntries}
            deleteEntry={deleteEntry}
            onContinueEntry={handleContinueEntry}
            onPinEntry={addFavourite}
            onUnpinEntry={removeFavourite}
            isFavourite={isFavourite}
          />
        )}
      </div>
    </PageShell>
  )
}
