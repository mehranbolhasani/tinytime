import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageShellProps {
  title: string
  subtitle?: string
  /** Rendered between the vertical rail and the content card, on the indigo background. */
  beforeContent?: ReactNode
  contentClassName?: string
  children: ReactNode
}

export default function PageShell({
  title,
  subtitle,
  beforeContent,
  contentClassName,
  children,
}: PageShellProps) {
  return (
    <section className="flex h-full flex-col items-stretch gap-0 bg-linear-to-b from-indigo-900 to-foreground md:bg-indigo-900 md:flex-row">
      <header className="flex shrink-0 flex-col-reverse gap-0.5 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] md:w-20 md:flex-col md:items-center md:justify-end md:gap-4 md:overflow-hidden md:px-0 md:py-6">
        {subtitle ? (
          <p className="truncate whitespace-nowrap text-sm tracking-normal text-indigo-300 md:rotate-180 md:[writing-mode:vertical-rl]">
            {subtitle}
          </p>
        ) : null}
        <h1 className="truncate whitespace-nowrap text-xl font-bold tracking-tighter text-indigo-100 md:rotate-180 md:text-2xl md:[writing-mode:vertical-rl]">
          {title}
        </h1>
      </header>

      {beforeContent ? <div className="shrink-0 px-4 pb-3 md:contents">{beforeContent}</div> : null}

      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto bg-background rounded-2xl md:rounded-tr-none md:rounded-bl-2xl max-w-[calc(100%-12px)] mx-auto w-full',
          contentClassName
        )}
      >
        {children}
      </div>
    </section>
  )
}

export function PageShellSkeleton() {
  return (
    <section
      className="flex h-full flex-col items-stretch gap-0 bg-indigo-900 md:flex-row"
      aria-busy="true"
    >
      <header className="flex shrink-0 flex-col-reverse gap-0.5 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] md:w-20 md:flex-col md:items-center md:justify-end md:gap-4 md:overflow-hidden md:px-0 md:py-6">
        <div className="h-5 w-24 rounded bg-indigo-300/40 md:hidden" />
        <div className="h-7 w-32 rounded bg-indigo-100/60 md:hidden" />
      </header>
      <div className="min-h-0 flex-1 rounded-t-2xl bg-background md:rounded-tr-none md:rounded-bl-2xl" />
    </section>
  )
}
