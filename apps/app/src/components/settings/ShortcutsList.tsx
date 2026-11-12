const SHORTCUTS = [
  { keys: 'Cmd/Ctrl + K', action: 'open command palette' },
  { keys: 'g then t/c/r/p', action: 'navigate views' },
  { keys: 'Cmd/Ctrl + Shift + S', action: 'start or stop timer' },
  { keys: 'Alt + Left/Right', action: 'previous or next day in Calendar' },
]

export default function ShortcutsList() {
  return (
    <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2">
      <p className="text-xs font-medium text-foreground">Keyboard shortcuts</p>
      <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
        {SHORTCUTS.map((shortcut) => (
          <li key={shortcut.keys}>{shortcut.keys}: {shortcut.action}</li>
        ))}
      </ul>
    </div>
  )
}
