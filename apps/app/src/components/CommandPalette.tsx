import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { BarChart3, Calendar, Clock, FolderOpen, Home, Play, Square, type LucideIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useTimerContext } from '@/contexts/TimerContext'
import { useTimeEntriesList } from '@/hooks/useTimeEntries'

interface CommandItem {
  id: string
  label: string
  keywords: string[]
  icon: LucideIcon
  action: () => void
  meta?: string
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (to: string) => void
  onToggleTimer: () => Promise<void>
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function CommandPalette({ open, onOpenChange, onNavigate, onToggleTimer }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [prevOpen, setPrevOpen] = useState(open)
  const { isRunning } = useTimerContext()

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setQuery('')
      setSelectedIndex(0)
    }
  }

  const paletteRange = useMemo(() => {
    if (!open) return { from: undefined as string | undefined, to: undefined as string | undefined }
    const from = new Date()
    from.setDate(from.getDate() - 30)
    from.setHours(0, 0, 0, 0)
    const to = new Date()
    to.setDate(to.getDate() + 1)
    to.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: to.toISOString() }
  }, [open])

  const { entries: recentEntries } = useTimeEntriesList({
    from: paletteRange.from,
    to: paletteRange.to,
  })

  const allItems = useMemo((): CommandItem[] => {
    const items: CommandItem[] = [
      {
        id: 'nav-today',
        label: 'Go to Today',
        keywords: ['today', 'home', 't'],
        icon: Home,
        action: () => onNavigate('/'),
      },
      {
        id: 'nav-calendar',
        label: 'Go to Calendar',
        keywords: ['calendar', 'c'],
        icon: Calendar,
        action: () => onNavigate('/calendar'),
      },
      {
        id: 'nav-reports',
        label: 'Go to Reports',
        keywords: ['reports', 'r'],
        icon: BarChart3,
        action: () => onNavigate('/reports'),
      },
      {
        id: 'nav-projects',
        label: 'Go to Projects',
        keywords: ['projects', 'p'],
        icon: FolderOpen,
        action: () => onNavigate('/projects'),
      },
      {
        id: 'timer-toggle',
        label: isRunning ? 'Stop timer' : 'Start timer',
        keywords: ['timer', 'start', 'stop', 's'],
        icon: isRunning ? Square : Play,
        action: onToggleTimer,
      },
    ]

    const seen = new Set<string>()
    const sortedEntries = [...recentEntries].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    )

    for (const entry of sortedEntries) {
      if (items.length - 5 >= 15) {
        break
      }

      const desc = entry.description?.trim() ?? ''
      const projectName = entry.projects?.name ?? ''
      if (!desc && !projectName) {
        continue
      }

      const dedupeKey = `${desc}|${entry.project_id ?? ''}`
      if (seen.has(dedupeKey)) {
        continue
      }
      seen.add(dedupeKey)

      const date = new Date(entry.started_at)
      const dateLabel = formatDateLabel(date)
      const meta = projectName ? `${projectName} · ${dateLabel}` : dateLabel

      items.push({
        id: `entry-${entry.id}`,
        label: desc || projectName,
        keywords: [desc, projectName].filter(Boolean),
        icon: Clock,
        meta,
        action: () => {
          onNavigate(`/calendar?date=${toLocalDateKey(date)}`)
        },
      })
    }

    return items
  }, [recentEntries, isRunning, onNavigate, onToggleTimer])

  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems
    const lower = query.toLowerCase()
    return allItems.filter((item) => {
      if (item.label.toLowerCase().includes(lower)) return true
      return item.keywords.some((kw) => kw.toLowerCase().includes(lower))
    })
  }, [allItems, query])

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [open])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
      } else if (e.key === 'Enter' && filteredItems.length > 0) {
        e.preventDefault()
        const item = filteredItems[selectedIndex]
        if (item) {
          item.action()
          onOpenChange(false)
        }
      }
    },
    [filteredItems, selectedIndex, onOpenChange]
  )

  useEffect(() => {
    const el = document.querySelector(`[data-command-index="${selectedIndex}"]`)
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const activeDescendant = filteredItems[selectedIndex]
    ? `command-option-${filteredItems[selectedIndex].id}`
    : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        mobileFullscreen
        className="top-[20%] max-w-md translate-y-0 p-0 gap-0 max-sm:flex max-sm:flex-col"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedIndex(0)
          }}
          placeholder="Search or jump to…"
          aria-label="Command search"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-palette-list"
          aria-activedescendant={activeDescendant}
          className="w-full rounded-t-2xl border-0 border-b border-border bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
        <div
          id="command-palette-list"
          role="listbox"
          className="max-h-64 overflow-y-auto p-2 max-sm:max-h-none max-sm:flex-1"
        >
          {filteredItems.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground/60">
              No commands match.
            </p>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon
              return (
                <button
                  type="button"
                  key={item.id}
                  id={`command-option-${item.id}`}
                  role="option"
                  aria-selected={index === selectedIndex}
                  data-command-index={index}
                  onClick={() => {
                    item.action()
                    onOpenChange(false)
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none ${
                    index === selectedIndex ? 'bg-secondary' : ''
                  }`}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.meta ? (
                    <span className="ml-auto text-xs text-muted-foreground/60">{item.meta}</span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
