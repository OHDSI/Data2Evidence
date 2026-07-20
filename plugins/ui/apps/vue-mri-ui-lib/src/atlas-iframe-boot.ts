/**
 * Iframe boot shim for the Atlas3 shell (entry of atlas-iframe.html).
 *
 * Waits for the parent wrapper parcel to deliver auth/dataset context via
 * postMessage (functions cannot cross the frame boundary through URL params),
 * publishes it as window.__MRI_PORTAL_CONTEXT__ and only then imports main.ts
 * so the app boots with context already present. Subsequent pa-context
 * messages just refresh the token.
 */

type PaContextMessage = {
  type: 'pa-context'
  token?: string
  datasetId?: string
  releaseId?: string
  username?: string
  locale?: string
  qeSvcUrl?: string
}

let currentToken = ''
let booted = false

window.addEventListener('message', (event: MessageEvent<PaContextMessage>) => {
  if (event.origin !== window.location.origin) return
  const data = event.data
  if (!data || data.type !== 'pa-context') return

  currentToken = data.token || ''

  if (booted) return
  booted = true
  ;(window as any).__MRI_PORTAL_CONTEXT__ = {
    getToken: async () => currentToken,
    datasetId: data.datasetId || '',
    releaseId: data.releaseId || '',
    username: data.username || 'admin',
    locale: data.locale || 'en',
    qeSvcUrl: data.qeSvcUrl || window.location.origin,
  }
  void import('./main')
})

window.parent?.postMessage({ type: 'pa-ready' }, window.location.origin)
