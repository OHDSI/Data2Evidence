<template>
  <div class="shiny-iframe-wrapper">
    <div v-if="loading" class="iframe-loading">
      <div class="spinner"></div>
      <p>Loading dashboard...</p>
    </div>

    <div v-if="error" class="iframe-error">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
    </div>

    <iframe
      v-show="!loading && !error"
      ref="iframeRef"
      :src="iframeUrl"
      class="shiny-iframe"
      frameborder="0"
      @load="handleIframeLoad"
    ></iframe>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getPortalAPI } from '@/utils/PortalUtils'
import type { Dashboard } from '@/api/DashboardService'

const props = defineProps<{
  dashboard: Dashboard
  datasetId: string
  cohortId: string
  wizardConfig?: Record<string, any> // Wizard configuration object
  mriquery?: string // MRI query string (JSON stringified)
}>()

// Dynamic origin detection - no hardcoding needed!
const CURRENT_ORIGIN = window.location.origin
const iframeRef = ref<HTMLIFrameElement | null>(null)
const bearerToken = ref<string>('')
const isIframeReady = ref(false)
const tokenSent = ref(false)
const loading = ref(true)
const error = ref<string | null>(null)

const portalAPI = getPortalAPI()

// Build iframe URL with resourceId format
// Format: /api/dataset/shiny-live/{datasetId}_{type}_{name}_{language}/
// Note: datasetId kept in URL for routing, cohortId moved to postMessage context
const iframeUrl = computed(() => {
  if (!props.dashboard) return ''

  // Construct resourceId
  const resourceId = `${props.datasetId}_${props.dashboard.type}_${props.dashboard.name}_${props.dashboard.language}`

  return `/gateway/api/dataset/shiny-live/${resourceId}`
})

// Set up message listeners IMMEDIATELY in setup, not in onMounted
// This prevents race condition where iframe sends SHINYLIVE_READY before listeners are attached
window.addEventListener('message', handleIframeMessage)

onMounted(async () => {
  console.log('[Parent] Component mounted, fetching token')
  // Fetch initial token
  await fetchAuthToken()
  console.log('[Parent] Token fetched, ready to authenticate iframe')

  // Fallback: If iframe loaded before component mounted, it might have sent SHINYLIVE_READY already
  // Poll to check if iframe is actually ready and resend token if needed
  setTimeout(() => {
    if (!isIframeReady.value && iframeRef.value?.contentWindow) {
      console.log('[Parent] Iframe may have loaded before listener attached, requesting ready signal')
      // Ask iframe to resend SHINYLIVE_READY if it's already initialized
      try {
        const iframeOrigin = getIframeOrigin()
        iframeRef.value.contentWindow.postMessage({ type: 'PING' }, iframeOrigin)
      } catch (err) {
        console.warn('[Parent] Could not ping iframe:', err)
      }
    }
  }, 1000)
})

onUnmounted(() => {
  console.log('[Parent] Component unmounting, cleaning up listeners')
  window.removeEventListener('message', handleIframeMessage)
})

// No watcher needed - send on SHINYLIVE_READY only

async function fetchAuthToken() {
  try {
    const token = await portalAPI.getToken()
    if (token) {
      bearerToken.value = token
    } else {
      error.value = 'Failed to retrieve authentication token'
    }
  } catch (err) {
    console.error('Error fetching auth token:', err)
    error.value = 'Authentication failed'
  }
}

function handleIframeMessage(event: MessageEvent) {
  console.log('[Parent] Raw message received:', {
    origin: event.origin,
    type: event.data?.type,
    timestamp: new Date().toISOString(),
    hasData: !!event.data,
    source: event.source === iframeRef.value?.contentWindow ? 'our-iframe' : 'unknown',
  })

  // Dynamic origin validation: Accept message from iframe's actual origin
  const iframeOrigin = getIframeOrigin()
  console.log('[Parent] Origin check:', { received: event.origin, expected: iframeOrigin })

  if (event.origin !== iframeOrigin) {
    console.warn('[Parent] ⚠️ REJECTED - Origin mismatch:', event.origin, 'Expected:', iframeOrigin)
    return
  }

  const data = event.data
  console.log('[Parent] ✓ ACCEPTED message type:', data.type)

  // Handle ready signal from ShinyLive app (both framework and custom signals)
  if (data.type === 'SHINYLIVE_READY') {
    console.log('[Parent] ShinyLive iframe is ready')

    // Only send token on first ready signal
    if (!tokenSent.value && bearerToken.value) {
      console.log('[Parent] Sending AUTH_TOKEN immediately')
      isIframeReady.value = true
      loading.value = false
      sendTokenToIframe(event.source)
    } else if (!bearerToken.value) {
      console.log('[Parent] Token not ready yet, waiting...')
      isIframeReady.value = true
      loading.value = false
    } else {
      console.log('[Parent] Token already sent, ignoring duplicate READY')
    }
  }

  // Handle auth ready confirmation
  if (data.type === 'AUTH_READY') {
    console.log('[Parent] Iframe confirmed authentication')
    tokenSent.value = true
  }

  // Handle error messages from ShinyLive
  if (data.type === 'SHINYLIVE_ERROR') {
    console.error('[Parent] ShinyLive error:', data.message)
    error.value = data.message || 'An error occurred in the dashboard'
    loading.value = false
  }
}

function getIframeOrigin(): string {
  // Extract origin from iframe src URL
  if (iframeRef.value?.src) {
    try {
      const url = new URL(iframeRef.value.src, window.location.origin)
      return url.origin
    } catch (e) {
      console.warn('Could not parse iframe origin, using current origin')
    }
  }
  return window.location.origin
}

function sendTokenToIframe(source?: MessageEventSource) {
  if (!iframeRef.value?.contentWindow || !bearerToken.value) {
    console.warn('[Parent] Cannot send token: iframe or token not available')
    return
  }

  // Serialize wizard config to plain object (remove Vue Proxy)
  // This is needed because postMessage can't clone Proxy objects
  let serializedWizardConfig = null
  if (props.wizardConfig) {
    try {
      serializedWizardConfig = JSON.parse(JSON.stringify(props.wizardConfig))
    } catch (e) {
      console.warn('[Parent] Failed to serialize wizard config:', e)
      serializedWizardConfig = null
    }
  }


  const message = {
    type: 'AUTH_TOKEN',
    token: bearerToken.value,
    timestamp: Date.now(),
    parentOrigin: CURRENT_ORIGIN,

    // Additional context data (all serialized to plain objects)
    context: {
      datasetId: props.datasetId,
      cohortId: props.cohortId,
      wizardConfig: serializedWizardConfig,
      mriquery: props.mriquery || null,
    },
  }

  try {

    source?.postMessage(message)

    console.log('[Parent] Token and context sent successfully')
  } catch (err) {
    console.error('[Parent] Error sending message to iframe:', err)
    error.value = 'Failed to authenticate with dashboard'
  }
}

function handleIframeLoad() {
  console.log('ShinyLive iframe loaded')
  // Wait for SHINYLIVE_READY message before considering it fully loaded
  // Set a timeout in case the app doesn't send the ready signal
  setTimeout(() => {
    if (!isIframeReady.value) {
      console.warn('ShinyLive app did not send ready signal, proceeding anyway')
      isIframeReady.value = true
      loading.value = false
    }
  }, 5000) // 5 second timeout
}
</script>

<style scoped>
.shiny-iframe-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.shiny-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.iframe-loading,
.iframe-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: white;
  z-index: 1;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.iframe-loading p {
  margin-top: 16px;
  font-size: 16px;
  color: #6b7280;
}

.iframe-error {
  text-align: center;
  padding: 40px;
}

.error-icon {
  font-size: 64px;
  margin-bottom: 16px;
  display: block;
}

.iframe-error p {
  font-size: 16px;
  color: #dc2626;
  margin: 0;
}
</style>
