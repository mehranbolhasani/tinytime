import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { hexToRgba } from '@/lib/color'
import { formatDate, formatDuration } from '@/lib/utils'

export default function EntryDetailsDialog({ entry, tags, open, onOpenChange }) {
  const project = entry?.projects
  const description = entry?.description?.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Entry details</DialogTitle>
          <DialogDescription>Full information for the selected report row.</DialogDescription>
        </DialogHeader>

        {!entry ? null : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium text-foreground">{formatDate(entry.started_at)}</span>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-mono font-medium text-foreground">
                {formatDuration(entry.duration_seconds ?? 0)}
              </span>
            </div>

            <div className="space-y-2 rounded-lg bg-secondary px-3 py-2">
              <p className="text-muted-foreground">Project</p>
              {project ? (
                <span className="inline-flex items-center gap-2 text-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: project.color ?? 'var(--muted-foreground)' }}
                  />
                  {project.name}
                </span>
              ) : (
                <span className="text-muted-foreground/80">—</span>
              )}
            </div>

            <div className="space-y-2 rounded-lg bg-secondary px-3 py-2">
              <p className="text-muted-foreground">Description</p>
              <p className="text-foreground">{description || '—'}</p>
            </div>

            <div className="space-y-2 rounded-lg bg-secondary px-3 py-2">
              <p className="text-muted-foreground">Tags</p>
              {tags.length === 0 ? (
                <span className="text-muted-foreground/80">—</span>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: hexToRgba(tag.color, 0.15),
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
