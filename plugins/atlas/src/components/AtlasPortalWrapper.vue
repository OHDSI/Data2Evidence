<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, inject } from 'vue';
import { sendDataset, sendLocale, listenToAtlas } from '../utils/portalBridge';
import type { PluginProps } from '../types';

const props = defineProps<{
  name?: string;
}>();

const pluginProps = inject<PluginProps>('pluginProps');

// Atlas3 reads its auth token from localStorage under this key (see its bundle:
// initializeFromStorage() -> localStorage.getItem('bearerToken') -> setToken()).
const ATLAS_TOKEN_KEY = 'bearerToken';

const atlasFrame = ref<HTMLIFrameElement | null>(null);
// The iframe src is only set AFTER the token is written to localStorage, so
// Atlas3 finds it on boot and never shows its own login screen.
const atlasUrl = ref<string>('');
const isLoading = ref(true);
const error = ref<string | null>(null);

let cleanupListener: (() => void) | null = null;
let tokenRefreshInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Resolve the current portal (Logto) token.
 * trex's authn middleware accepts this Logto token (Authorization header or
 * `authtoken` cookie) on /WebAPI/* calls and exchanges it for a WebAPI token,
 * so Atlas3 only ever needs to hold the Logto token.
 */
async function resolveToken(): Promise<string> {
  if (typeof pluginProps?.getToken === 'function') {
    return (await pluginProps.getToken()) || '';
  }
  return pluginProps?.authContext?.token || '';
}

/**
 * Write the token into the shared (same-origin) localStorage so the embedded
 * Atlas3 picks it up. /atlas-portal and /atlas are the same origin, so this
 * localStorage is shared with the iframe.
 */
function storeToken(token: string): void {
  if (!token) return;
  try {
    window.localStorage.setItem(ATLAS_TOKEN_KEY, token);
  } catch (err) {
    console.error('[AtlasPortalWrapper] Failed to store token:', err);
  }
}

/** Refresh the stored token. */
async function syncAuth(): Promise<void> {
  const token = await resolveToken();
  if (token) storeToken(token);
}

function onFrameLoad(): void {
  isLoading.value = false;
  // Push initial dataset / locale context (these still use postMessage).
  if (pluginProps?.datasetId && atlasFrame.value) {
    sendDataset(atlasFrame.value, pluginProps.datasetId);
  }
  if (pluginProps?.locale && atlasFrame.value) {
    sendLocale(atlasFrame.value, pluginProps.locale);
  }
}

function onFrameError(): void {
  error.value = 'Failed to load Atlas';
  isLoading.value = false;
}

watch(
  () => pluginProps?.datasetId,
  (newDatasetId) => {
    if (newDatasetId && atlasFrame.value && !isLoading.value) {
      sendDataset(atlasFrame.value, newDatasetId);
    }
  }
);

watch(
  () => pluginProps?.locale,
  (newLocale) => {
    if (newLocale && atlasFrame.value && !isLoading.value) {
      sendLocale(atlasFrame.value, newLocale);
    }
  }
);

onMounted(async () => {
  // 1. Seed the token BEFORE the iframe navigates so Atlas3 is authenticated on boot.
  try {
    const token = await resolveToken();
    if (token) {
      storeToken(token);
    } else {
      console.warn('[AtlasPortalWrapper] No portal token available; Atlas3 may prompt for login');
    }
  } catch (err) {
    console.error('[AtlasPortalWrapper] Failed to resolve token before load:', err);
  }

  // 2. Now load Atlas3, deep-linked straight to the cohort definitions page
  //    (hash route) rather than the Atlas home/welcome screen.
  atlasUrl.value = '/atlas/?embedded=true#/cohorts';

  // 3. Keep the token fresh; re-sync on request from Atlas (if it ever asks).
  cleanupListener = listenToAtlas((message) => {
    if (message.type === 'ready' || message.type === 'request-auth') {
      void syncAuth();
    }
  });
  tokenRefreshInterval = setInterval(() => void syncAuth(), 5 * 60 * 1000);
});

onUnmounted(() => {
  cleanupListener?.();
  if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);
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
      v-if="atlasUrl"
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
  border-top: 4px solid #000080;
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
