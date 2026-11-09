import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GoogleConnectError, useCompleteGoogleConnection } from '@/hooks/useGoogleCalendar'

export default function GoogleCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { mutateAsync } = useCompleteGoogleConnection()
  const startedRef = useRef(false) // StrictMode runs effects twice; the request must only be sent once.

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const code = params.get('code')
    const state = params.get('state')
    if (!code || !state) {
      navigate('/calendar?google=error&reason=invalid_request', { replace: true })
      return
    }
    mutateAsync({ code, state })
      .then(() => navigate('/calendar?google=connected', { replace: true }))
      .catch((error: unknown) => {
        const reason = error instanceof GoogleConnectError ? error.code : 'unknown'
        navigate(`/calendar?google=error&reason=${encodeURIComponent(reason)}`, { replace: true })
      })
  }, [mutateAsync, navigate, params])

  return (
    <div role="status" className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
      Connecting your Google Calendar…
    </div>
  )
}
