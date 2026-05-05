import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { TimeEntry } from '@/types'

interface DeleteEntryAlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: TimeEntry | null
  onConfirm: () => void
}

export default function DeleteEntryAlertDialog({
  open,
  onOpenChange,
  entry,
  onConfirm,
}: DeleteEntryAlertDialogProps) {
  const entryLabel = entry?.description?.trim() || entry?.projects?.name || 'this time entry'

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete time entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This action permanently removes {entryLabel} from your calendar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Delete entry
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
