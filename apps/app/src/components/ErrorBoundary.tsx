import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Short label for logs, e.g. 'app' or 'route:/calendar'. */
  scope: string
}

interface ErrorBoundaryState {
  error: Error | null
}

const CHUNK_LOAD_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i

function isChunkLoadError(error: Error | null): boolean {
  return Boolean(error && CHUNK_LOAD_ERROR_PATTERN.test(error.message))
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[error-boundary:${this.props.scope}]`, error, info.componentStack)
  }

  private handleRetry = () => {
    this.setState({ error: null })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    const isChunkError = isChunkLoadError(this.state.error)

    return (
      <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
        <p className="font-medium text-foreground">
          {isChunkError ? 'A new version of tinytime is available.' : 'Something went wrong.'}
        </p>
        <p className="mt-1 text-muted-foreground">
          {isChunkError
            ? 'Reload to get the latest version.'
            : 'Your tracked time is safe. Try again, or reload the page.'}
        </p>
        {isChunkError ? (
          <div className="mt-4">
            <Button type="button" size="sm" onClick={this.handleReload}>Reload</Button>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <Button type="button" size="sm" onClick={this.handleRetry}>Try again</Button>
            <Button type="button" size="sm" variant="outline" onClick={this.handleReload}>Reload</Button>
          </div>
        )}
      </div>
    )
  }
}
