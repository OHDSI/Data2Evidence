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
  const targetOrigin = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`

  const preloadToken = async () => {
    const token = await portalContext.getToken()
    sessionStorage.setItem('d2e-token', token)
    sessionStorage.setItem('d2e-datasetId', portalContext.datasetId)
    sessionStorage.setItem('d2e-username', portalContext.username)
    tokenReady.value = true
  }

  const sendToken = async () => {
    const iframeWindow = iframeRef.value?.contentWindow
    if (!iframeWindow) {
      return
    }

    const token = await portalContext.getToken()
    iframeWindow.postMessage(
      {
        type: 'SETUP_ATLAS',
        token,
        datasetId: portalContext.datasetId,
        username: portalContext.username,
      },
      targetOrigin
    )
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
