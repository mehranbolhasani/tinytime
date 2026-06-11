import { AnimatePresence, motion } from 'motion/react'
import { toSafeHexColor } from '@/lib/color'
import { presets } from '@/lib/motion'
import type { FavouriteEntry } from '@/hooks/useFavouriteEntries'

interface FavouriteChipsProps {
  favourites: FavouriteEntry[]
  onSelect: (fav: FavouriteEntry) => void
  onRemove: (id: string) => void
}

export default function FavouriteChips({ favourites, onSelect, onRemove }: FavouriteChipsProps) {
  if (favourites.length === 0) return null

  return (
    <ul className="flex gap-2 overflow-x-auto pb-1 list-none">
      <AnimatePresence initial={false}>
        {favourites.map((fav) => {
          const label = fav.description ?? fav.projectName ?? 'Untitled'
          const dotColor = fav.projectColor ? toSafeHexColor(fav.projectColor) : null

          return (
            <motion.li
              key={fav.id}
              variants={presets.listItem.variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={presets.listItem.transition}
              layout
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={dotColor ? { backgroundColor: dotColor } : undefined}
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => onSelect(fav)}
                className="max-w-[120px] truncate text-xs text-foreground hover:text-foreground/80 focus-visible:outline-none"
              >
                {label}
              </button>
              <button
                type="button"
                aria-label="Remove favourite"
                onClick={() => onRemove(fav.id)}
                className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none"
              >
                ×
              </button>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
