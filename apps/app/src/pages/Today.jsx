import { AnimatePresence, motion } from 'motion/react'
import EntryList from '@/components/timer/EntryList'
import TimerWidget from '@/components/timer/TimerWidget'
import { Skeleton } from '@/components/ui/skeleton'
import { useTimeEntriesList, useTimeEntryMutations } from '@/hooks/useTimeEntries'
import { presets } from '@/lib/motion'
import { localDayRange } from '@/lib/utils'

export default function Today() {
  const today = new Date()
  const { from, to } = localDayRange(today)

  const { entries, isLoading, error } = useTimeEntriesList({ from, to })
  const { createEntry, stopEntry, deleteEntry } = useTimeEntryMutations({ entries })

  const completedEntries = entries.filter((entry) => entry.stopped_at !== null)

  return (
    <section className="flex flex-col gap-4">

      <div className="w-md max-w-md mx-auto bg-background flex items-center justify-between">
        <h1 className="text-2xl font-pixel font-bold text-foreground tracking-tighter">Today</h1>

        <p className="text-sm text-muted-foreground tracking-tight">
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

      {!isLoading ? <EntryList entries={completedEntries} deleteEntry={deleteEntry} /> : null}
    </section>
  )
}
