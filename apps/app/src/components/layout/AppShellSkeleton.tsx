import { PageShellSkeleton } from '@/components/layout/PageShell'

/** Static stand-in for `AppLayout` + `PageShell` used before the session/app frame mounts. */
export default function AppShellSkeleton() {
  return (
    <div className="mx-auto flex h-screen max-h-screen w-full justify-center items-stretch gap-0 bg-foreground p-0 overflow-hidden">
      <header className="h-full bg-foreground z-1 flex flex-col gap-4 w-20 items-center justify-between px-0 py-6 rounded-lg">
        <div className="inline-flex items-center gap-0 w-10 h-10 justify-center bg-primary/80 rounded-lg aspect-square">
          <span className="relative h-1.5 w-6 rounded-sm bg-background" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-full max-h-screen flex-1 bg-background rounded-l-2xl overflow-hidden">
        <PageShellSkeleton />
      </main>
    </div>
  )
}
