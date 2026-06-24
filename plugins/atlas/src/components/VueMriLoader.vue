<template>
  <div class="vue-mri-loader">
    <PluginContainer />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import PluginContainer from './PluginContainer.vue';
import { loadEsModuleScript, loadScopedStyleSheet, loadSapScript, type CleanupCallback } from '../utils/scriptLoader';

// vue-mri mounts into `.vue-main`; scope all its CSS under that so it can't
// restyle the Atlas3 host (Atlas3 is also a Vuetify app sharing class names).
const MRI_SCOPE = '.vue-main';

// vue-mri (Patient Analytics) is served by d2e under /d2e/mri/ and its SAP UI5
// runtime under /d2e/ui/. We load it the way the d2e portal does
// (apps/portal/src/plugins/mri/utils/PAPlugin.tsx): bootstrap SAP UI5, then the
// app's CSS, then its ES-module JS.
const ORIGIN = window.location.origin;
const D2E_BASE = `${ORIGIN}/d2e/`;
const ASSETS_URL = `${D2E_BASE}mri/assets.json`;
const SAP_CORE_URL = `${D2E_BASE}ui/sap-ui-core.js`;

// The @d4l web-components library is normally registered by the d2e portal at
// boot; in Atlas3 nobody loads it, so vue-mri's stencil loader 404s on its
// entry chunk. We register d4l ourselves from the copy served at /atlas/d4l-ui/.
// d4l-ui.esm.js auto-detects its resourcesUrl from import.meta.url, so its lazy
// chunks load from /atlas/d4l-ui/. Loading it first means vue-mri's own
// defineCustomElements() finds the elements already defined and skips them.
const D4L_LOADER = `${ORIGIN}/atlas/d4l-ui/d4l-ui.esm.js`;

let cleanupCallbacks: CleanupCallback[] = [];

function loadModule(src: string): Promise<void> {
  return new Promise((resolve) => {
    cleanupCallbacks.push(loadEsModuleScript(src, () => resolve()));
  });
}

onMounted(async () => {
  try {
    // 1. Register d4l web components before vue-mri runs.
    await loadModule(D4L_LOADER).catch((e) => console.error('[VueMriLoader] d4l load failed:', e));

    const response = await fetch(ASSETS_URL);
    if (!response.ok) {
      throw new Error(`Failed to load vue-mri assets manifest (${response.status})`);
    }
    const { css, js } = await response.json();

    const loadMriAssets = () => {
      // Load vue-mri's CSS scoped under .vue-main so it can't restyle Atlas3.
      for (const href of css || []) {
        loadScopedStyleSheet(href, MRI_SCOPE).then((cleanup) => cleanupCallbacks.push(cleanup));
      }
      const cacheKey = `${localStorage.getItem('selectedVocabulary') || 'default'}_${new Date().getTime()}`;
      for (const src of js || []) {
        cleanupCallbacks.push(loadEsModuleScript(`${src}?v=${cacheKey}`, () => {}));
      }
    };

    // 2. Bootstrap SAP UI5 once. SAP UI5 cannot be re-bootstrapped — if the
    // plugin is re-mounted (navigating away and back), reloading sap-ui-core.js
    // throws "found in negative cache: Core.js". So if SAP is already present,
    // reuse it and don't reload (and never remove it on unmount).
    if ((window as any).sap?.ui) {
      loadMriAssets();
    } else {
      loadSapScript(SAP_CORE_URL, loadMriAssets, D2E_BASE);
    }
  } catch (error) {
    console.error('[VueMriLoader] Failed to load vue-mri:', error);
  }
});

onUnmounted(() => {
  cleanupCallbacks.forEach((cleanup) => cleanup());
  cleanupCallbacks = [];
});
</script>

<style scoped>
.vue-mri-loader {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
