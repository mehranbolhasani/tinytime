import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useTimerContext } from '@/contexts/TimerContext'
import { useTimeEntriesList } from '@/hooks/useTimeEntries'

interface CommandItem {
  id: string
  label: string
  keywords: string[]
  icon: string
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

export default function CommandPalette({ open, onOpenChange, onNavigate, onToggleTimer }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { isRunning } = useTimerContext()

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
        icon: 'ti-home',
        action: () => onNavigate('/'),
      },
      {
        id: 'nav-calendar',
        label: 'Go to Calendar',
        keywords: ['calendar', 'c'],
        icon: 'ti-calendar',
        action: () => onNavigate('/calendar'),
      },
      {
        id: 'nav-reports',
        label: 'Go to Reports',
        keywords: ['reports', 'r'],
        icon: 'ti-chart-bar',
        action: () => onNavigate('/reports'),
      },
      {
        id: 'nav-projects',
        label: 'Go to Projects',
        keywords: ['projects', 'p'],
        icon: 'ti-folder',
        action: () => onNavigate('/projects'),
      },
      {
        id: 'timer-toggle',
        label: isRunning ? 'Stop timer' : 'Start timer',
        keywords: ['timer', 'start', 'stop', 's'],
        icon: isRunning ? 'ti-player-stop' : 'ti-player-play',
        action: onToggleTimer,
      },
    ]

    for (const entry of recentEntries) {
      const date = new Date(entry.started_at)
      const desc = entry.description ?? 'No description'
      const projectName = entry.projects?.name ?? ''
      const dateLabel = formatDateLabel(date)
      const meta = projectName ? `${projectName} · ${dateLabel}` : dateLabel

      items.push({
        id: `entry-${entry.id}`,
        label: desc,
        keywords: [desc, projectName].filter(Boolean),
        icon: 'ti-clock',
        meta,
        action: () => {
          sessionStorage.setItem('tinytime:calendar-jump-date', date.toISOString())
          onNavigate('/calendar')
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
    setSelectedIndex(0)
  }, [filteredItems.length])

  useEffect(() => {
    if (open) {
      setQuery('')
    }
  }, [open])

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
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search or jump to…"
          aria-label="Command search"
          className="w-full rounded-t-2xl border-0 border-b border-border bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
        <div className="max-h-64 overflow-y-auto p-2 max-sm:max-h-none max-sm:flex-1">
          {filteredItems.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground/60">
              No commands match.
            </p>
          ) : (
            filteredItems.map((item, index) => (
              <button
                type="button"
                key={item.id}
                data-command-index={index}
                onClick={() => {
                  item.action()
                  onOpenChange(false)
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none ${
                  index === selectedIndex ? 'bg-secondary' : ''
                }`}
              >
                <i className={`ti ${item.icon} text-muted-foreground`} style={{ fontSize: 16 }} aria-hidden="true" />
                <span>{item.label}</span>
                {item.meta ? (
                  <span className="ml-auto text-xs text-muted-foreground/60">{item.meta}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
