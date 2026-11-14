const SHORTCUTS = [
  { keys: 'Cmd/Ctrl + K', action: 'open command palette' },
  { keys: 'Cmd/Ctrl + ,', action: 'open preferences' },
  { keys: 'g then t/c/r/p', action: 'navigate views' },
  { keys: 'Cmd/Ctrl + Shift + S', action: 'start or stop timer' },
  { keys: 'Alt + Left/Right', action: 'previous or next day in Calendar' },
]

export default function ShortcutsList() {
  return (
    <div className="py-5 border-t border-border/20 [@media(hover:none)]:hidden">
      <p className="text-xs font-medium text-background">Keyboard shortcuts</p>
      <ul className="mt-1 space-y-1 text-xs text-background/70">
        {SHORTCUTS.map((shortcut) => (
          <li key={shortcut.keys}>{shortcut.keys}: {shortcut.action}</li>
        ))}
      </ul>
    </div>
  )
}
