import { useMemo } from 'react'
import FloatingAlerts, { FloatingAlert } from '@/components/layout/FloatingAlerts'
import PageShell from '@/components/layout/PageShell'
import EntryList, { EntryListSkeleton } from '@/components/timer/EntryList'
import FavouriteChips from '@/components/timer/FavouriteChips'
import TimerWidget from '@/components/timer/TimerWidget'
import TodayDialCard from '@/components/timer/TodayDialCard'
import { useFavouriteEntries } from '@/hooks/useFavouriteEntries'
import { useLocalDay } from '@/hooks/useLocalDay'
import { useProjects } from '@/hooks/useProjects'
import { useTimeEntriesList, useTimeEntryMutations } from '@/hooks/useTimeEntries'
import { useTimerControlActions } from '@/hooks/useTimerControlActions'
import { localDayRange } from '@/lib/dates'
import type { FavouriteEntry } from '@/hooks/useFavouriteEntries'
import type { TimeEntry } from '@/types'

export default function Today() {
  const today = useLocalDay()
  const { from, to } = localDayRange(today)

  const { entries, isLoading, error } = useTimeEntriesList({ from: from ?? undefined, to: to ?? undefined })
  const { deleteEntry } = useTimeEntryMutations({ entries })
  const { startTimer } = useTimerControlActions()
  const { favourites, addFavourite, removeFavourite, isFavourite } = useFavouriteEntries()
  const { projects, isLoading: isLoadingProjects } = useProjects()

  const resolvedFavourites = useMemo(
    () =>
      favourites.map((favourite) => {
        if (!favourite.project_id) {
          return favourite
        }

        const project = projects.find((item) => item.id === favourite.project_id)
        if (project) {
          return { ...favourite, projectName: project.name, projectColor: project.color }
        }

        if (isLoadingProjects) {
          return favourite
        }

        return { ...favourite, project_id: null, projectName: null, projectColor: null }
      }),
    [favourites, isLoadingProjects, projects]
  )

  const handleContinueEntry = (entry: TimeEntry) => {
    void startTimer({
      projectId: entry.project_id,
      description: entry.description ?? '',
    })
  }

  const handleSelectFavourite = (fav: FavouriteEntry) => {
    void startTimer({
      projectId: fav.project_id,
      description: fav.description ?? '',
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
      beforeContent={
        <FavouriteChips
          favourites={resolvedFavourites}
          onSelect={handleSelectFavourite}
          onRemove={removeFavourite}
        />
      }
    >
      <FloatingAlerts>
        {error ? <FloatingAlert>{error.message}</FloatingAlert> : null}
      </FloatingAlerts>

      <TimerWidget isEntriesLoading={isLoading} />

      <div className="flex flex-col gap-4 rounded-t-2xl bg-indigo-100 p-4 md:justify-between md:gap-0 md:rounded-none md:rounded-l-2xl">
        <TodayDialCard entries={entries} isLoading={isLoading} />

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
