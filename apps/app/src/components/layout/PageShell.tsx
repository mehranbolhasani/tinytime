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
    <section className="flex h-full items-stretch gap-0 bg-indigo-900">
      <header className="flex w-20 shrink-0 flex-col items-center justify-end gap-4 overflow-hidden py-6">
        {subtitle ? (
          <p className="rotate-180 whitespace-nowrap text-sm tracking-normal text-indigo-300 [writing-mode:vertical-rl]">
            {subtitle}
          </p>
        ) : null}
        <h1 className="rotate-180 whitespace-nowrap text-2xl font-bold tracking-tighter text-indigo-100 [writing-mode:vertical-rl]">
          {title}
        </h1>
      </header>

      {beforeContent}

      <div className={cn('min-h-0 flex-1 overflow-y-auto rounded-l-2xl bg-background', contentClassName)}>
        {children}
      </div>
    </section>
  )
}

export function PageShellSkeleton() {
  return (
    <section className="flex h-full items-stretch gap-0 bg-indigo-900" aria-busy="true">
      <div className="w-20 shrink-0" />
      <div className="min-h-0 flex-1 rounded-l-2xl bg-background" />
    </section>
  )
}
