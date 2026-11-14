import { PageShellSkeleton } from '@/components/layout/PageShell'

/** Static stand-in for `AppLayout` + `PageShell` used before the session/app frame mounts. */
export default function AppShellSkeleton() {
  return (
    <div className="relative mx-auto flex h-dvh w-full flex-col justify-center items-stretch gap-0 bg-foreground p-0 overflow-hidden md:flex-row">
      <main className="relative z-10 mx-auto w-full max-w-full min-h-0 flex-1 overflow-hidden rounded-b-2xl bg-background md:rounded-br-none md:rounded-tl-2xl">
        <PageShellSkeleton />
      </main>

      <header className="relative z-1 order-last flex w-full shrink-0 items-center gap-4 bg-foreground px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:order-first md:h-full md:w-20 md:flex-col md:items-center md:justify-between md:rounded-lg md:px-0 md:py-6">
        <div className="hidden md:inline-flex md:h-10 md:w-10 md:items-center md:justify-center md:rounded-lg md:bg-primary/80 md:aspect-square">
          <span className="relative h-1.5 w-6 rounded-sm bg-background" />
        </div>
        <div className="h-14 w-full md:hidden" />
      </header>
    </div>
  )
}
