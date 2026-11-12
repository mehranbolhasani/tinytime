import { supabaseConfigError } from '@/lib/supabase'

export default function ConfigErrorView() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Supabase is not configured</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {supabaseConfigError}
        </p>
        <p className="mt-4 text-sm text-muted-foreground/70">
          Add the missing environment variables in your `.env` file and restart the dev server.
        </p>
      </section>
    </main>
  )
}
