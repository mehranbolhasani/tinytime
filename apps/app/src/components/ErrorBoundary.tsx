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

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
        <p className="font-medium text-foreground">Something went wrong.</p>
        <p className="mt-1 text-muted-foreground">Your tracked time is safe. Try again, or reload the page.</p>
        <div className="mt-4 flex gap-2">
          <Button type="button" size="sm" onClick={this.handleRetry}>Try again</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </div>
    )
  }
}
