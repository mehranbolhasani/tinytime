import { useCallback, useEffect, useState } from 'react'
import { useCurrentUserId } from '@/contexts/SessionContext'
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

const LEGACY_STORAGE_KEY = 'tinytime:favourites'
const MAX_FAVOURITES = 8

function storageKeyForUser(userId: string): string {
  return `tinytime:favourites:${userId}`
}

function parseFavourites(raw: string | null): FavouriteEntry[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as FavouriteEntry[]
  } catch {
    return []
  }
}

function loadFavourites(userId: string): FavouriteEntry[] {
  try {
    const storageKey = storageKeyForUser(userId)
    const stored = localStorage.getItem(storageKey)

    if (stored !== null) {
      return parseFavourites(stored)
    }

    // One-time migration from the pre-user-scoped key.
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy === null) {
      return []
    }

    const migrated = parseFavourites(legacy)
    try {
      localStorage.setItem(storageKey, legacy)
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      // Ignore storage failures (e.g. Safari private mode).
    }
    return migrated
  } catch {
    return []
  }
}

function saveFavourites(userId: string, favourites: FavouriteEntry[]): void {
  try {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(favourites))
  } catch {
    // Ignore storage failures (e.g. Safari private mode).
  }
}

export function useFavouriteEntries(): UseFavouriteEntriesResult {
  const userId = useCurrentUserId()
  const [favourites, setFavourites] = useState<FavouriteEntry[]>(() => loadFavourites(userId))

  useEffect(() => {
    setFavourites(loadFavourites(userId))
  }, [userId])

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

      saveFavourites(userId, updated)
      return updated
    })
  }, [userId])

  const removeFavourite = useCallback((id: string) => {
    setFavourites((prev) => {
      const updated = prev.filter((f) => f.id !== id)
      saveFavourites(userId, updated)
      return updated
    })
  }, [userId])

  const isFavourite = useCallback(
    (entry: TimeEntry) =>
      favourites.some(
        (f) => f.description === entry.description && f.project_id === entry.project_id
      ),
    [favourites]
  )

  return { favourites, addFavourite, removeFavourite, isFavourite }
}
