import { useCallback, useState } from 'react'
import type { TimeEntry } from '@/types'

export interface FavouriteEntry {
  id: string
  description: string | null
  project_id: string | null
  projectName: string | null
  projectColor: string | null
}

interface UseFavouriteEntriesResult {
  favourites: FavouriteEntry[]
  addFavourite: (entry: TimeEntry) => void
  removeFavourite: (id: string) => void
  isFavourite: (entry: TimeEntry) => boolean
}

const STORAGE_KEY = 'tinytime:favourites'
const MAX_FAVOURITES = 8

function loadFavourites(): FavouriteEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as FavouriteEntry[]
  } catch {
    return []
  }
}

function saveFavourites(favourites: FavouriteEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favourites))
}

export function useFavouriteEntries(): UseFavouriteEntriesResult {
  const [favourites, setFavourites] = useState<FavouriteEntry[]>(loadFavourites)

  const addFavourite = useCallback((entry: TimeEntry) => {
    setFavourites((prev) => {
      const exists = prev.some(
        (f) => f.description === entry.description && f.project_id === entry.project_id
      )
      if (exists) return prev

      const next: FavouriteEntry = {
        id: crypto.randomUUID(),
        description: entry.description,
        project_id: entry.project_id,
        projectName: entry.projects?.name ?? null,
        projectColor: entry.projects?.color ?? null,
      }

      const updated = prev.length >= MAX_FAVOURITES
        ? [...prev.slice(1), next]
        : [...prev, next]

      saveFavourites(updated)
      return updated
    })
  }, [])

  const removeFavourite = useCallback((id: string) => {
    setFavourites((prev) => {
      const updated = prev.filter((f) => f.id !== id)
      saveFavourites(updated)
      return updated
    })
  }, [])

  const isFavourite = useCallback(
    (entry: TimeEntry) =>
      favourites.some(
        (f) => f.description === entry.description && f.project_id === entry.project_id
      ),
    [favourites]
  )

  return { favourites, addFavourite, removeFavourite, isFavourite }
}
