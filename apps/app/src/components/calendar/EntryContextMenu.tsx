import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Copy, Pencil, Trash2, type LucideIcon } from 'lucide-react'
import { durations, easings, variants } from '@/lib/motion'
import type { TimeEntry } from '@/types'

interface MenuState {
  open: boolean
  entry: TimeEntry
  x: number
  y: number
}

interface EntryContextMenuProps {
  menuState: MenuState | null
  onClose: () => void
  onEdit: (entry: TimeEntry) => void
  onDuplicate: (entry: TimeEntry) => void
  onDelete: (entry: TimeEntry) => void
}

function clampPosition(position: number, max: number): number {
  return Math.max(8, Math.min(position, Math.max(8, max - 184)))
}

export default function EntryContextMenu({
  menuState,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: EntryContextMenuProps) {
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 })
  const isOpen = Boolean(menuState?.open && menuState?.entry)
  const horizontalOrigin =
    typeof window !== 'undefined' && menuPosition.left > window.innerWidth / 2 ? 'right' : 'left'
  const verticalOrigin =
    typeof window !== 'undefined' && menuPosition.top > window.innerHeight / 2 ? 'bottom' : 'top'
  const transformOrigin = `${horizontalOrigin} ${verticalOrigin}`

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const updatePosition = () => {
      const maxWidth = window.innerWidth
      const maxHeight = window.innerHeight
      setMenuPosition({
        left: clampPosition(menuState!.x, maxWidth),
        top: clampPosition(menuState!.y, maxHeight),
      })
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('[data-entry-context-menu]')) {
        return
      }
      onClose()
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handlePointerDown)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isOpen, menuState, onClose])

  interface Action {
    label: string
    icon: LucideIcon
    onSelect: (entry: TimeEntry) => void
    tone?: 'danger'
  }

  const actions = useMemo<Action[]>(
    () => [
      { label: 'Edit', icon: Pencil, onSelect: onEdit },
      { label: 'Duplicate', icon: Copy, onSelect: onDuplicate },
      { label: 'Delete', icon: Trash2, onSelect: onDelete, tone: 'danger' },
    ],
    [onDelete, onDuplicate, onEdit]
  )

  return (
    <AnimatePresence>
      {isOpen && menuState ? (
        <motion.div
          key={`entry-context-menu-${menuState.entry.id}`}
          data-entry-context-menu
          className="fixed z-50 w-44 rounded-xl border border-border bg-popover p-1 shadow-xl"
          style={{ left: menuPosition.left, top: menuPosition.top, transformOrigin }}
          onPointerDown={(event) => event.stopPropagation()}
          variants={variants.popLayout}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: durations.short, ease: easings.standard as unknown as import('motion/react').Easing }}
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                action.onSelect(menuState.entry)
                onClose()
              }}
              className={
                action.tone === 'danger'
                  ? 'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10'
                  : 'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary'
              }
            >
              <action.icon className="h-4 w-4" />
              <span>{action.label}</span>
            </button>
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
