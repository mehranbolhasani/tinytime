import DeleteEntryAlertDialog from '@/components/calendar/DeleteEntryAlertDialog'
import EntryDetailSheet from '@/components/calendar/EntryDetailSheet'
import EntryEditDialog from '@/components/calendar/EntryEditDialog'
import type { useEntryActions } from '@/hooks/useEntryActions'

interface EntryActionDialogsProps {
  actions: ReturnType<typeof useEntryActions>
}

export default function EntryActionDialogs({ actions }: EntryActionDialogsProps) {
  return (
    <>
      <EntryDetailSheet
        entry={actions.sheetEntry}
        open={Boolean(actions.sheetEntry)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            actions.setSheetEntry(null)
          }
        }}
        onEdit={(entry) => {
          actions.setSheetEntry(null)
          actions.openEdit(entry)
        }}
        onDuplicate={actions.duplicate}
        onDelete={actions.requestDelete}
      />

      <EntryEditDialog
        entry={actions.editingEntry}
        open={Boolean(actions.editingEntry)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            actions.setEditingEntry(null)
          }
        }}
      />

      <DeleteEntryAlertDialog
        entry={actions.entryToDelete}
        open={Boolean(actions.entryToDelete)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            actions.setEntryToDelete(null)
          }
        }}
        onConfirm={() => {
          void actions.confirmDelete()
        }}
        error={actions.error}
        isDeleting={actions.isDeleting}
      />
    </>
  )
}
