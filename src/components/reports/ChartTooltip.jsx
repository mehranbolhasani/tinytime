export default function ChartTooltip({ title, lines = [] }) {
  return (
    <div className="min-w-36 rounded-xl border border-border bg-card/95 px-3 py-2 shadow-[0_8px_20px_color-mix(in_oklab,var(--foreground)_8%,transparent)] backdrop-blur-sm">
      {title ? <p className="text-xs font-medium text-foreground">{title}</p> : null}
      {lines.length > 0 ? (
        <div className={title ? 'mt-1 space-y-0.5' : 'space-y-0.5'}>
          {lines.map((line) => (
            <p key={line} className="text-xs text-muted-foreground">
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}
