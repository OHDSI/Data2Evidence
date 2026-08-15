import { ref, watch, onBeforeUnmount, type Ref } from 'vue'
import { usePortalContext } from './usePortalContext'
import { useAtlasStore } from '@/stores/atlas'

export function useAtlasIframe(iframeRef: Ref<HTMLIFrameElement | null>) {
  const portalContext = usePortalContext()
  const atlasStore = useAtlasStore()
  const tokenReady = ref(false)
  let refreshInterval: number | null = null
  let closeListener: ((event: MessageEvent) => void) | null = null

  const originUrl = `${window.location.protocol}//${window.location.hostname}${
    window.location.port ? ':' + window.location.port : ''
  }`

  // Atlas3 stores its auth token in localStorage under this key and restores the
  // session from it on boot (initializeFromStorage). The Patient Analytics app and
  // the /atlas iframe are the same origin, so localStorage is shared between them.
  // trex's authn middleware exchanges this Logto token for a WebAPI token on each
  // /WebAPI/* request.
  const ATLAS_TOKEN_KEY = 'bearerToken'

  // Seed the token into shared (same-origin) localStorage BEFORE the iframe loads,
  // so Atlas3 authenticates on boot without showing its login screen.
  const preloadToken = async () => {
    const token = await portalContext.getToken()
    localStorage.setItem(ATLAS_TOKEN_KEY, token)
    tokenReady.value = true
  }

  // Keep the shared localStorage token fresh so Atlas3 keeps using a valid token
  // across refreshes. A parent-window write fires a `storage` event in the iframe
  // (Atlas3 listens for it to sync its in-memory token); re-writing the same value
  // is a no-op event-wise, so the interval is safe.
  const sendToken = async () => {
    const token = await portalContext.getToken()
    if (token) {
      localStorage.setItem(ATLAS_TOKEN_KEY, token)
    }
  }

  closeListener = event => {
    if (event.origin !== originUrl || event.data?.type !== 'CLOSE_ATLAS') {
      return
    }
    atlasStore.closeAtlas()
  }
  window.addEventListener('message', closeListener)

  watch(tokenReady, ready => {
    if (ready && !refreshInterval) {
      refreshInterval = window.setInterval(sendToken, 1000)
    }
  })

  onBeforeUnmount(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
    }
    if (closeListener) {
      window.removeEventListener('message', closeListener)
    }
  })

  return {
    tokenReady,
    preloadToken,
    handleIframeLoad: sendToken,
  }
}
