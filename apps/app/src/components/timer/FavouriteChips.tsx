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
    <div className="flex gap-2 overflow-x-auto pb-1">
      <AnimatePresence initial={false}>
        {favourites.map((fav) => {
          const label = fav.description ?? fav.projectName ?? 'Untitled'
          const dotColor = fav.projectColor ? toSafeHexColor(fav.projectColor) : null

          return (
            <motion.button
              key={fav.id}
              type="button"
              variants={presets.listItem.variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={presets.listItem.transition}
              layout
              onClick={() => onSelect(fav)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs transition-colors hover:bg-accent"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={dotColor ? { backgroundColor: dotColor } : undefined}
              />
              <span className="max-w-[120px] truncate">{label}</span>
              <span
                role="button"
                aria-label="Remove favourite"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(fav.id)
                }}
                className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              >
                ×
              </span>
            </motion.button>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
