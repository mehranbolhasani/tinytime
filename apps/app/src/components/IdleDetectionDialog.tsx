import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface IdleDetectionDialogProps {
  open: boolean
  idleSeconds: number
  hiddenAt: Date
  onKeep: () => void
  onDiscard: () => void
}

function formatIdleTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`
}

export default function IdleDetectionDialog({
  open,
  idleSeconds,
  onKeep,
  onDiscard,
}: IdleDetectionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onKeep() }}>
      <AlertDialogContent>
        <AlertDialogTitle>You were away</AlertDialogTitle>
        <AlertDialogDescription>
          You were away for {formatIdleTime(idleSeconds)}. What should we do with
          the time tracked since then?
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onKeep}>Keep it all</AlertDialogCancel>
          <AlertDialogAction onClick={onDiscard}>Discard idle time</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
