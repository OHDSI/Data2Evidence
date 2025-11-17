<template>
  <div class="vue-mri-loader">
    <PluginContainer />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import PluginContainer from './PluginContainer.vue';
import { loadScript, loadStyleSheet, loadSapScript, injectInlineScript, type CleanupCallback } from '../utils/scriptLoader';

// Vue MRI assets are served from the Portal backend at /mri/*
// The auth-proxy proxies /mri/* and /ui/* to Portal backend (https://localhost:41100)
const ASSETS_URL = '/mri/assets.json';
const SAP_CORE_URL = '/ui/sap-ui-core.js';
const VUE_COMPAT_URL = 'https://cdn.jsdelivr.net/npm/@vue/compat@3.5.17/dist/vue.global.prod.js';
const BASE_URL = '/'; // Base URL for resources

let cleanupCallbacks: CleanupCallback[] = [];

onMounted(async () => {
  try {
    // vue-mri dependencies (like vuedraggable) expect window.Vue with Vue 2 APIs
    // Save the current window.Vue (Atlas3's Vue 3) and restore it later
    const originalVue = (window as any).Vue;

    // Wait for portalAPI to be set on the plugin-container element
    // vue-mri's getPortalAPI() looks for this
    const waitForPortalAPI = () => {
      return new Promise<void>((resolve, reject) => {
        console.log('[VueMRI Loader] Waiting for portalAPI...');
        let attempts = 0;
        const maxAttempts = 100; // 5 seconds max wait

        const checkInterval = setInterval(() => {
          attempts++;
          const containers = document.getElementsByClassName('plugin-container');

          // Find the container that has portalAPI (there may be multiple containers)
          let containerWithAPI = null;
          for (let i = 0; i < containers.length; i++) {
            if ((containers[i] as any).portalAPI) {
              containerWithAPI = containers[i];
              break;
            }
          }

          if (attempts === 1 || attempts % 20 === 0) {
            console.log(`[VueMRI Loader] Attempt ${attempts}: found ${containers.length} containers, portalAPI found: ${!!containerWithAPI}`);
          }

          if (containerWithAPI) {
            console.log('[VueMRI Loader] portalAPI found on container:', (containerWithAPI as any).portalAPI);
            clearInterval(checkInterval);
            resolve();
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            reject(new Error('Timeout waiting for portalAPI'));
          }
        }, 50);
      });
    };

    console.log('[VueMRI Loader] Starting load process...');
    await waitForPortalAPI();
    console.log('[VueMRI Loader] portalAPI ready, loading Vue compat...');

    // Get the portalAPI from our container and copy it to ALL plugin-container elements
    // This is needed because vue-mri's getPortalAPI() checks if there's exactly 1 container,
    // but we have 2 (Atlas3's container and our plugin's container)
    const containers = document.getElementsByClassName('plugin-container');
    let portalAPI = null;
    for (let i = 0; i < containers.length; i++) {
      if ((containers[i] as any).portalAPI) {
        portalAPI = (containers[i] as any).portalAPI;
        break;
      }
    }

    // Set portalAPI on ALL plugin-container elements
    if (portalAPI) {
      console.log('[VueMRI Loader] Found portalAPI, copying to all', containers.length, 'containers');
      for (let i = 0; i < containers.length; i++) {
        if (!(containers[i] as any).portalAPI) {
          (containers[i] as any).portalAPI = portalAPI;
          console.log('[VueMRI Loader] Copied portalAPI to container', i);
        } else {
          console.log('[VueMRI Loader] Container', i, 'already has portalAPI');
        }
      }
    } else {
      console.error('[VueMRI Loader] No portalAPI found to copy!');
    }

    // Load Vue compat globally first - this provides Vue 2 APIs for vue-mri dependencies
    const vueCompatCleanup = loadScript(VUE_COMPAT_URL, async () => {
      console.log('[VueMRI Loader] Vue compat loaded, window.Vue:', !!(window as any).Vue);

      // Fetch the assets manifest
      const response = await fetch(ASSETS_URL);
      if (!response.ok) {
        throw new Error('Failed to load vue-mri assets manifest');
      }

      const { css, js } = await response.json();

      console.log('[VueMRI Loader] Loading assets:', { css, js });

      // Load SAP UI5 core
      const sapCleanup = loadSapScript(SAP_CORE_URL, () => {
        console.log('[VueMRI Loader] SAP UI5 loaded');

        // Verify portalAPI is still on all containers before loading vue-mri scripts
        const containersNow = document.getElementsByClassName('plugin-container');
        console.log('[VueMRI Loader] Before loading vue-mri scripts, checking', containersNow.length, 'containers:');
        for (let i = 0; i < containersNow.length; i++) {
          console.log(`  Container ${i}: has portalAPI =`, !!(containersNow[i] as any).portalAPI);
          if ((containersNow[i] as any).portalAPI) {
            console.log(`    portalAPI content:`, (containersNow[i] as any).portalAPI);
          }
        }

        // Re-verify right before loading each script
        console.log('[VueMRI Loader] About to load stylesheets and scripts');

        // Patch getElementsByClassName to intercept vue-mri's getPortalAPI() call
        // This is a workaround for when there are multiple plugin-container elements
        const patchScript = injectInlineScript(`
          console.log('[Patch Script] Installing interceptors');

          // Save the original getElementsByClassName
          const originalGetElementsByClassName = Document.prototype.getElementsByClassName;

          // Override getElementsByClassName to handle the special case for 'plugin-container'
          Document.prototype.getElementsByClassName = function(className) {
            const result = originalGetElementsByClassName.call(this, className);

            // If this is being called for 'plugin-container', check if we're in the context
            // of getPortalAPI (by checking the call stack or just always applying the fix)
            if (className === 'plugin-container') {
              console.log('[Patch] getElementsByClassName("plugin-container") called, found', result.length, 'elements');

              // If there are multiple containers, temporarily report only one with portalAPI
              if (result.length > 1) {
                // Find the container with portalAPI
                for (let i = 0; i < result.length; i++) {
                  if (result[i].portalAPI) {
                    console.log('[Patch] Multiple containers detected, returning only the one with portalAPI (index', i, ')');
                    // Return a fake HTMLCollection with just this one element
                    const fakeCollection = [result[i]];
                    fakeCollection.item = function(index) { return this[index] || null; };
                    Object.defineProperty(fakeCollection, 'length', { value: 1, writable: false });
                    return fakeCollection;
                  }
                }
              }
            }

            return result;
          };

          // Set webpack public path to load chunks from the correct location
          // Vue-mri chunks are served from /mri/js/, not from the plugin's location
          window.__webpack_public_path__ = '/mri/';

          console.log('[Patch Script] Set __webpack_public_path__ to /mri/');
          console.log('[Patch Script] Interceptors installed');
        `, 'portal-api-patch');

        // Then load stylesheets and scripts
        const styleCallbacks = css.map((href: string) => loadStyleSheet(href));
        const scriptCallbacks = js.map((src: string) => {
          // Check containers one more time right before loading this specific script
          const check = document.getElementsByClassName('plugin-container');
          console.log(`[VueMRI Loader] Right before loading ${src}:`, check.length, 'containers, first has portalAPI:', !!(check[0] as any).portalAPI);

          return loadScript(src, () => {
            console.log('[VueMRI Loader] Loaded script:', src);
          });
        });

        cleanupCallbacks = [...styleCallbacks, ...scriptCallbacks, patchScript];
      }, BASE_URL);

      cleanupCallbacks.push(sapCleanup);
    });

    cleanupCallbacks.push(vueCompatCleanup);

    // Cleanup: restore original Vue when unmounting
    cleanupCallbacks.push(() => {
      if (originalVue) {
        (window as any).Vue = originalVue;
      } else {
        delete (window as any).Vue;
      }
    });

  } catch (error) {
    console.error('[VueMRI Loader] Failed to load vue-mri:', error);
  }
});

onUnmounted(() => {
  // Cleanup all loaded scripts and stylesheets
  cleanupCallbacks.forEach(cleanup => cleanup());
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
