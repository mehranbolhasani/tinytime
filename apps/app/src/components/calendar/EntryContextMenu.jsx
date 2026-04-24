import { useEffect, useMemo, useState } from 'react'
import { Copy, Pencil, Trash2 } from 'lucide-react'

function clampPosition(position, max) {
  return Math.max(8, Math.min(position, Math.max(8, max - 184)))
}

export default function EntryContextMenu({ menuState, onClose, onEdit, onDuplicate, onDelete }) {
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 })

  useEffect(() => {
    if (!menuState?.open) {
      return undefined
    }

    const updatePosition = () => {
      const maxWidth = window.innerWidth
      const maxHeight = window.innerHeight
      setMenuPosition({
        left: clampPosition(menuState.x, maxWidth),
        top: clampPosition(menuState.y, maxHeight),
      })
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const handlePointerDown = (event) => {
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
  }, [menuState, onClose])

  const actions = useMemo(
    () => [
      { label: 'Edit', icon: Pencil, onSelect: onEdit },
      { label: 'Duplicate', icon: Copy, onSelect: onDuplicate },
      { label: 'Delete', icon: Trash2, onSelect: onDelete, tone: 'danger' },
    ],
    [onDelete, onDuplicate, onEdit]
  )

  if (!menuState?.open || !menuState.entry) {
    return null
  }

  return (
    <div
      data-entry-context-menu
      className="fixed z-50 w-44 rounded-xl border border-border bg-popover p-1 shadow-xl"
      style={{ left: menuPosition.left, top: menuPosition.top }}
      onPointerDown={(event) => event.stopPropagation()}
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
    </div>
  )
}
