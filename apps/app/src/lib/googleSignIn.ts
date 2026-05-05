declare global {
  interface Window {
    google?: {
      accounts?: {
        id: {
          initialize: (config: object) => void
          renderButton: (container: HTMLElement, options: object) => void
        }
      }
    }
  }
}

const GIS_CLIENT_READY_TIMEOUT_MS = 10_000

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function randomNonce(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return bufferToBase64Url(bytes.buffer)
}

export async function generateNonce(): Promise<{ nonce: string; hashedNonce: string }> {
  const nonce = randomNonce()
  const encoded = new TextEncoder().encode(nonce)
  const digest = await crypto.subtle.digest('SHA-256', encoded)

  return {
    nonce,
    hashedNonce: bufferToBase64Url(digest),
  }
}

export function loadGisScript(): Promise<unknown> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Identity Services is only available in the browser.'))
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google.accounts.id)
  }

  return new Promise((resolve, reject) => {
    const startedAt = Date.now()

    const check = () => {
      if (window.google?.accounts?.id) {
        resolve(window.google.accounts.id)
        return
      }

      if (Date.now() - startedAt > GIS_CLIENT_READY_TIMEOUT_MS) {
        reject(new Error('Google Sign-In did not load. Check your network and CSP settings.'))
        return
      }

      window.setTimeout(check, 100)
    }

    check()
  })
}

interface InitGoogleSignInOptions {
  clientId: string
  hashedNonce: string
  onCredential: (credential: string) => void
}

export function initGoogleSignIn({ clientId, hashedNonce, onCredential }: InitGoogleSignInOptions): void {
  if (!window.google?.accounts?.id) {
    throw new Error('Google Identity Services is not loaded.')
  }

  window.google.accounts.id.initialize({
    client_id: clientId,
    nonce: hashedNonce,
    callback: ({ credential }: { credential: string }) => onCredential?.(credential),
    use_fedcm_for_prompt: true,
    ux_mode: 'popup',
  })
}

interface RenderGoogleButtonOptions {
  theme?: string
  size?: string
  shape?: string
  text?: string
  width?: number
}

export function renderGoogleButton(
  container: HTMLElement,
  options: RenderGoogleButtonOptions = {}
): void {
  if (!container) {
    throw new Error('Google button container is missing.')
  }

  if (!window.google?.accounts?.id) {
    throw new Error('Google Identity Services is not loaded.')
  }

  container.innerHTML = ''

  window.google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: 'continue_with',
    width: 220,
    ...options,
  })
}
