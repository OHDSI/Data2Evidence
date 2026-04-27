<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, inject } from 'vue';
import { sendAuth, sendDataset, sendLocale, listenToAtlas } from '../utils/portalBridge';
import type { PluginProps } from '../types';

const props = defineProps<{
  name?: string;
}>();

const pluginProps = inject<PluginProps>('pluginProps');

const atlasFrame = ref<HTMLIFrameElement | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);

// Build the Atlas URL - use the standalone Atlas3 at /atlas/
const atlasUrl = ref('/atlas/?embedded=true');

// Cleanup function for message listener
let cleanupListener: (() => void) | null = null;

/**
 * Send auth credentials to the iframe
 */
async function syncAuth() {
  if (!atlasFrame.value?.contentWindow) return;

  try {
    let token = '';

    // Get token from pluginProps.getToken() if available
    if (typeof pluginProps?.getToken === 'function') {
      token = await pluginProps.getToken();
    } else if (pluginProps?.authContext?.token) {
      token = pluginProps.authContext.token;
    }

    if (token) {
      sendAuth(atlasFrame.value, {
        token,
        username: pluginProps?.username,
        idpUserId: pluginProps?.idpUserId,
      });
    }
  } catch (err) {
    console.error('[AtlasPortalWrapper] Failed to get token:', err);
  }
}

/**
 * Handle iframe load event
 */
function onFrameLoad() {
  console.log('[AtlasPortalWrapper] Atlas iframe loaded');
  isLoading.value = false;

  // Send auth immediately - don't wait, Atlas3 makes API calls right away
  syncAuth();

  // Send initial dataset if available
  if (pluginProps?.datasetId && atlasFrame.value) {
    sendDataset(atlasFrame.value, pluginProps.datasetId);
  }

  // Send locale if available
  if (pluginProps?.locale && atlasFrame.value) {
    sendLocale(atlasFrame.value, pluginProps.locale);
  }
}

/**
 * Handle iframe error
 */
function onFrameError() {
  error.value = 'Failed to load Atlas';
  isLoading.value = false;
}

// Watch for dataset changes
watch(
  () => pluginProps?.datasetId,
  (newDatasetId) => {
    if (newDatasetId && atlasFrame.value && !isLoading.value) {
      sendDataset(atlasFrame.value, newDatasetId);
    }
  }
);

// Watch for locale changes
watch(
  () => pluginProps?.locale,
  (newLocale) => {
    if (newLocale && atlasFrame.value && !isLoading.value) {
      sendLocale(atlasFrame.value, newLocale);
    }
  }
);

onMounted(() => {
  // Listen for messages from Atlas3
  cleanupListener = listenToAtlas((message) => {
    console.log('[AtlasPortalWrapper] Received message from Atlas:', message);

    switch (message.type) {
      case 'ready':
      case 'request-auth':
        // Atlas is ready or requesting auth, sync auth
        syncAuth();
        break;
      // Handle other message types as needed
    }
  });

  // Periodically refresh token
  const tokenRefreshInterval = setInterval(syncAuth, 5 * 60 * 1000); // Every 5 minutes

  onUnmounted(() => {
    cleanupListener?.();
    clearInterval(tokenRefreshInterval);
  });
});

onUnmounted(() => {
  cleanupListener?.();
});
</script>

<template>
  <div class="atlas-portal-wrapper">
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <div>Loading Atlas...</div>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <iframe
      ref="atlasFrame"
      :src="atlasUrl"
      class="atlas-iframe"
      @load="onFrameLoad"
      @error="onFrameError"
      allow="clipboard-read; clipboard-write"
    />
  </div>
</template>

<style scoped>
.atlas-portal-wrapper {
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 64px); /* Account for portal header */
  position: relative;
  display: flex;
  flex-direction: column;
}

.atlas-iframe {
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 64px);
  border: none;
  flex: 1;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 10;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 20px;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
  z-index: 10;
}
</style>
