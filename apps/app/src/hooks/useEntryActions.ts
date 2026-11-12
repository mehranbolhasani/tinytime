import { useCallback, useRef, useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useTimeEntryMutations } from '@/hooks/useTimeEntries'
import { buildDuplicateInput } from '@/lib/calendar'
import type { TimeEntry } from '@/types'

interface UseEntryActionsOptions {
  entries: TimeEntry[]
}

export function useEntryActions({ entries }: UseEntryActionsOptions) {
  const { createEntry, updateEntry, deleteEntry } = useTimeEntryMutations({ entries })
  const isTouchViewport = useMediaQuery('(hover: none)')
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [sheetEntry, setSheetEntry] = useState<TimeEntry | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<TimeEntry | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const deletingRef = useRef(false)

  const clearError = useCallback(() => setError(''), [])

  const openEntry = useCallback(
    (entry: TimeEntry) => {
      if (isTouchViewport && entry.stopped_at !== null) {
        setSheetEntry(entry)
      } else {
        setEditingEntry(entry)
      }
    },
    [isTouchViewport]
  )

  const openEdit = useCallback((entry: TimeEntry) => {
    setEditingEntry(entry)
  }, [])

  const requestDelete = useCallback((entry: TimeEntry) => {
    setError('')
    setSheetEntry(null)
    setEntryToDelete(entry)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!entryToDelete || deletingRef.current) {
      return
    }

    deletingRef.current = true
    setIsDeleting(true)
    setError('')

    try {
      await deleteEntry(entryToDelete.id)
      setEntryToDelete(null)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this entry.')
    } finally {
      deletingRef.current = false
      setIsDeleting(false)
    }
  }, [deleteEntry, entryToDelete])

  const duplicate = useCallback(
    async (entry: TimeEntry) => {
      await createEntry(buildDuplicateInput(entry))
    },
    [createEntry]
  )

  const duplicateAndReport = useCallback(
    async (entry: TimeEntry) => {
      try {
        setError('')
        await duplicate(entry)
      } catch (duplicateError) {
        setError(
          duplicateError instanceof Error ? duplicateError.message : 'Unable to duplicate this entry.'
        )
      }
    },
    [duplicate]
  )

  return {
    editingEntry,
    sheetEntry,
    entryToDelete,
    isDeleting,
    error,
    setEditingEntry,
    setSheetEntry,
    setEntryToDelete,
    setError,
    clearError,
    openEntry,
    openEdit,
    requestDelete,
    confirmDelete,
    duplicate,
    duplicateAndReport,
    createEntry,
    updateEntry,
  }
}
