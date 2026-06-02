import { AnimatePresence, motion } from 'motion/react'
import EntryList from '@/components/timer/EntryList'
import FavouriteChips from '@/components/timer/FavouriteChips'
import TimerWidget from '@/components/timer/TimerWidget'
import { Skeleton } from '@/components/ui/skeleton'
import { useFavouriteEntries } from '@/hooks/useFavouriteEntries'
import { useTimeEntriesList, useTimeEntryMutations } from '@/hooks/useTimeEntries'
import { useTimerControlActions } from '@/hooks/useTimerControlActions'
import { presets } from '@/lib/motion'
import { localDayRange } from '@/lib/utils'
import type { FavouriteEntry } from '@/hooks/useFavouriteEntries'
import type { TimeEntry } from '@/types'

export default function Today() {
  const today = new Date()
  const { from, to } = localDayRange(today)

  const { entries, isLoading, error } = useTimeEntriesList({ from: from ?? undefined, to: to ?? undefined })
  const { createEntry, stopEntry, deleteEntry } = useTimeEntryMutations({ entries })
  const { startTimer } = useTimerControlActions({ createEntry, stopEntry })
  const { favourites, addFavourite, removeFavourite, isFavourite } = useFavouriteEntries()

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
    <section className="flex flex-col gap-4">

      <div className="flex w-full flex-col gap-1 bg-background sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-pixel font-bold text-foreground tracking-tighter">Today</h1>

        <p className="min-w-0 text-sm text-muted-foreground tracking-tight sm:text-right">
          {today.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
   
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}

      <FavouriteChips
        favourites={favourites}
        onSelect={handleSelectFavourite}
        onRemove={removeFavourite}
      />

      <TimerWidget
        createEntry={createEntry}
        stopEntry={stopEntry}
        isEntriesLoading={isLoading}
      />

      <AnimatePresence mode="sync" initial={false}>
        {isLoading ? (
          <motion.div
            key="today-loading"
            variants={presets.panelSwap.variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={presets.panelSwap.transition}
            className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-[0px_1px_0px_rgba(0,0,0,0.05)]"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!isLoading ? (
        <EntryList
          entries={completedEntries}
          deleteEntry={deleteEntry}
          onContinueEntry={handleContinueEntry}
          onPinEntry={addFavourite}
          onUnpinEntry={removeFavourite}
          isFavourite={isFavourite}
        />
      ) : null}
    </section>
  )
}
