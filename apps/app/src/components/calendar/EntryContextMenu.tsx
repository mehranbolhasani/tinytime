import { useRef } from 'react'
import { Copy, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { TimeEntry } from '@/types'

interface MenuState {
  open: boolean
  entry: TimeEntry
  x: number
  y: number
  returnFocusTo?: HTMLElement | null
}

interface EntryContextMenuProps {
  menuState: MenuState | null
  onClose: () => void
  onEdit: (entry: TimeEntry) => void
  onDuplicate: (entry: TimeEntry) => void
  onDelete: (entry: TimeEntry) => void
}

export default function EntryContextMenu({
  menuState,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: EntryContextMenuProps) {
  const skipReturnFocusRef = useRef(false)
  const isOpen = Boolean(menuState?.open && menuState?.entry)

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <span
          aria-hidden="true"
          className="pointer-events-none fixed h-0 w-0"
          style={{ left: menuState?.x ?? 0, top: menuState?.y ?? 0 }}
        />
      </DropdownMenuTrigger>
      {menuState ? (
        <DropdownMenuContent
          align="start"
          sideOffset={4}
          className="w-44 rounded-xl p-1"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (!skipReturnFocusRef.current) {
              menuState.returnFocusTo?.focus()
            }
            skipReturnFocusRef.current = false
          }}
        >
          <DropdownMenuItem
            onSelect={() => {
              skipReturnFocusRef.current = true
              onEdit(menuState.entry)
            }}
          >
            <Pencil className="h-4 w-4" />
            <span>Edit</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              skipReturnFocusRef.current = false
              onDuplicate(menuState.entry)
            }}
          >
            <Copy className="h-4 w-4" />
            <span>Duplicate</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => {
              skipReturnFocusRef.current = true
              onDelete(menuState.entry)
            }}
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      ) : null}
    </DropdownMenu>
  )
}
