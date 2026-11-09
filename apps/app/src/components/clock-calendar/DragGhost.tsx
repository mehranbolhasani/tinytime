import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface DragGhostProps {
  ghostRef: React.RefObject<HTMLDivElement | null>
  label: string
  color: string
  duration: string
  isOverBin: boolean
}

export default function DragGhost({
  ghostRef,
  label,
  color,
  duration,
  isOverBin,
}: DragGhostProps) {
  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      ref={ghostRef}
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed left-0 top-0 z-50 flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm shadow-lg',
        isOverBin
          ? 'border-destructive bg-destructive/10 text-destructive'
          : 'border-border bg-card'
      )}
      style={{ transform: 'translate3d(-1000px, -1000px, 0)' }}
    >
      {!isOverBin ? (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      <span className="max-w-[24ch] truncate">
        {isOverBin ? 'Release to delete' : label}
      </span>
      {!isOverBin ? (
        <span className="shrink-0 text-xs text-muted-foreground">{duration}</span>
      ) : null}
    </div>,
    document.body
  )
}
