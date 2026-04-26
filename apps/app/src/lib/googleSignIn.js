const GIS_CLIENT_READY_TIMEOUT_MS = 10_000

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function randomNonce() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return bufferToBase64Url(bytes.buffer)
}

export async function generateNonce() {
  const nonce = randomNonce()
  const encoded = new TextEncoder().encode(nonce)
  const digest = await crypto.subtle.digest('SHA-256', encoded)

  return {
    nonce,
    hashedNonce: bufferToBase64Url(digest),
  }
}

export function loadGisScript() {
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

export function initGoogleSignIn({ clientId, hashedNonce, onCredential }) {
  if (!window.google?.accounts?.id) {
    throw new Error('Google Identity Services is not loaded.')
  }

  window.google.accounts.id.initialize({
    client_id: clientId,
    nonce: hashedNonce,
    callback: ({ credential }) => onCredential?.(credential),
    use_fedcm_for_prompt: true,
    ux_mode: 'popup',
  })
}

export function renderGoogleButton(container, options = {}) {
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
