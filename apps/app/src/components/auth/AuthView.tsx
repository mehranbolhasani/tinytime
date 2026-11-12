import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.38-1.33-1.75-1.33-1.75-1.09-.75.08-.74.08-.74 1.2.08 1.83 1.22 1.83 1.22 1.07 1.82 2.8 1.3 3.49.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.32-5.47-5.88 0-1.3.47-2.36 1.23-3.19-.12-.31-.53-1.54.12-3.21 0 0 1-.32 3.3 1.22a11.6 11.6 0 0 1 6 0c2.3-1.54 3.3-1.22 3.3-1.22.65 1.67.24 2.9.12 3.21.77.83 1.23 1.89 1.23 3.19 0 4.57-2.8 5.58-5.48 5.88.43.37.82 1.09.82 2.2v3.26c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  )
}

interface AuthViewProps {
  email: string
  onEmailChange: (email: string) => void
  onSubmit: (event: React.FormEvent) => void
  onSignInWithGithub: () => void
  isSubmitting: boolean
  isGithubSubmitting: boolean
  googleButtonRef: React.RefObject<HTMLDivElement | null>
  googleConfigError: string | null
  googleButtonError: string
  notice: string
  error: string
}

export default function AuthView({
  email,
  onEmailChange,
  onSubmit,
  onSignInWithGithub,
  isSubmitting,
  isGithubSubmitting,
  googleButtonRef,
  googleConfigError,
  googleButtonError,
  notice,
  error,
}: AuthViewProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full items-center justify-center bg-background px-4 py-10 sm:p-6">
      <div className="w-full max-w-sm flex flex-col items-center justify-center">
        <div>
          <div className="flex w-12 h-12 rounded-xl aspect-square items-center justify-center mx-auto bg-primary/10 mb-6">
            <span className="h-2 w-6 rounded-sm bg-primary" />
          </div>
        </div>
        <section className="w-full max-w-md text-center">
          <h1 className="text-lg font-semibold text-foreground">Sign in to tinytime</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use a magic link!
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="you@example.com"
              required
            />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full w-[220px]"
            >
              {isSubmitting ? 'Sending link...' : 'Send magic link'}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground/70">
            <div className="h-px flex-1 bg-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="flex min-h-10 w-[220px] items-center justify-center" ref={googleButtonRef} />
            {googleConfigError ? <p className="mt-2 text-xs text-destructive">{googleConfigError}</p> : null}
            {!googleConfigError && googleButtonError ? (
              <p className="mt-2 text-xs text-destructive">{googleButtonError}</p>
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={onSignInWithGithub}
              disabled={isGithubSubmitting}
              className="mt-3 w-[220px] rounded-full bg-secondary hover:bg-border"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <GitHubIcon className="h-4 w-4" />
                {isGithubSubmitting ? 'Redirecting to GitHub...' : 'Continue with GitHub'}
              </span>
            </Button>
          </div>

          {notice ? <p className="mt-3 text-sm text-success">{notice}</p> : null}
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </section>
      </div>
    </main>
  )
}
