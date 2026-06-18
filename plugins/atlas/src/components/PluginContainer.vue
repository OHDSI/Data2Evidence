<template>
  <div
    ref="containerRef"
    class="plugin-container"
  >
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <div>Loading Patient Analytics...</div>
    </div>
    <div class="vue-main"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, inject, watch } from 'vue';
import type { PluginProps } from '../types';
import { scopeStyleElement, scopeCssText } from '../utils/scriptLoader';

// vue-mri mounts into `.vue-main`; its runtime-injected styles are scoped here.
const MRI_SCOPE = '.vue-main';

const containerRef = ref<HTMLElement | null>(null);
const isLoading = ref(true);

const pluginProps = inject<PluginProps>('pluginProps');

const messageBus = pluginProps?.messageBus;

// vue-mri bundles its own Vuetify + SAP UI5, which add global CSS to <head> at
// runtime — both `<style>` (Vuetify theme `:root{--v-theme-*}` + components) and
// `<link>` (SAP `library.css`, which sets `body{font-family}`). Atlas3 is also a
// Vuetify app, so these leak. We snapshot Atlas3's own styles first, then scope
// every *foreign* stylesheet added afterwards under `.vue-main`:
//   - <style>: rewrite in place, and re-scope if its content is later rewritten
//              (Vuetify mutates its theme node's text, not the node itself).
//   - <link>:  fetch + scope into a sibling <style>, disable the original link.
// Everything we add/disable is tracked and reverted on unmount so it can't
// affect other Atlas3 pages.
let styleGuardObserver: MutationObserver | null = null;
let atlasStyleNodes: Element[] = [];
const perStyleObservers: MutationObserver[] = [];
const injectedScopedStyles: HTMLStyleElement[] = [];
const disabledLinks: HTMLLinkElement[] = [];
const ROOT_LEAK_RE = /(^|[}])\s*(:root|html|body|\*)\b/;

const watchStyleForRescope = (el: HTMLStyleElement) => {
  const obs = new MutationObserver(() => {
    // Re-scope only if the content was rewritten back to an unscoped root rule.
    if (ROOT_LEAK_RE.test(el.textContent || '')) {
      delete el.dataset.mriScoped;
      scopeStyleElement(el, MRI_SCOPE);
    }
  });
  obs.observe(el, { childList: true, characterData: true, subtree: true });
  perStyleObservers.push(obs);
};

const scopeForeignLink = async (link: HTMLLinkElement) => {
  if (link.dataset.mriProcessed) return;
  link.dataset.mriProcessed = '1';
  try {
    const resp = await fetch(link.href);
    const css = await resp.text();
    const style = document.createElement('style');
    style.dataset.mriScoped = '1';
    style.setAttribute('data-href', link.href);
    style.textContent = scopeCssText(css, MRI_SCOPE);
    link.after(style);
    injectedScopedStyles.push(style);
    link.media = 'not all'; // disable the original (keep node so SAP refs still resolve)
    disabledLinks.push(link);
  } catch {
    /* leave link as-is on failure */
  }
};

const scopeForeignNodes = (nodes: Iterable<Node>) => {
  for (const n of nodes) {
    const el = n as HTMLElement;
    if (atlasStyleNodes.includes(el)) continue;
    if (el.tagName === 'STYLE') {
      scopeStyleElement(el as HTMLStyleElement, MRI_SCOPE);
      watchStyleForRescope(el as HTMLStyleElement);
    } else if (
      el.tagName === 'LINK' &&
      (el as HTMLLinkElement).rel === 'stylesheet' &&
      /\/d2e\/|sap|d4l|\/mri\//.test((el as HTMLLinkElement).href)
    ) {
      void scopeForeignLink(el as HTMLLinkElement);
    }
  }
};

// vue-mri's getPortalAPI() only returns the portalAPI when there is EXACTLY ONE
// `.plugin-container` in the document. But vue-mri renders its own
// `.plugin-container` inside its layout, so two exist — and ours (the one with
// portalAPI) isn't the only one, so getPortalAPI() returns null and vue-mri
// never gets the token/studyId (stuck on "Content is loading"). Patch
// getElementsByClassName so a 'plugin-container' lookup resolves to the one
// carrying portalAPI.
let originalGetElementsByClassName: typeof Document.prototype.getElementsByClassName | null = null;

const installContainerLookupPatch = () => {
  if (originalGetElementsByClassName) return;
  originalGetElementsByClassName = Document.prototype.getElementsByClassName;
  const orig = originalGetElementsByClassName;
  Document.prototype.getElementsByClassName = function (className: string) {
    const result = orig.call(this, className);
    if (className === 'plugin-container' && result.length > 1) {
      for (let i = 0; i < result.length; i++) {
        if ((result[i] as any).portalAPI) {
          const single: any = [result[i]];
          single.item = function (idx: number) { return this[idx] || null; };
          Object.defineProperty(single, 'length', { value: 1, writable: false });
          return single as unknown as HTMLCollectionOf<Element>;
        }
      }
    }
    return result;
  };
};

const uninstallContainerLookupPatch = () => {
  if (originalGetElementsByClassName) {
    Document.prototype.getElementsByClassName = originalGetElementsByClassName;
    originalGetElementsByClassName = null;
  }
};

const installStyleGuard = () => {
  // Snapshot Atlas3's stylesheets (present before vue-mri loads its own).
  atlasStyleNodes = Array.from(
    document.head.querySelectorAll('link[rel="stylesheet"], style')
  );
  styleGuardObserver = new MutationObserver((mutations) => {
    for (const m of mutations) scopeForeignNodes(m.addedNodes);
  });
  styleGuardObserver.observe(document.head, { childList: true });
};

const uninstallStyleGuard = () => {
  styleGuardObserver?.disconnect();
  styleGuardObserver = null;
  perStyleObservers.forEach((o) => o.disconnect());
  perStyleObservers.length = 0;
  // Remove the scoped styles we injected and re-enable the links we disabled,
  // so nothing vue-mri-related lingers on other Atlas3 pages.
  injectedScopedStyles.forEach((s) => s.parentNode?.removeChild(s));
  injectedScopedStyles.length = 0;
  disabledLinks.forEach((l) => l.removeAttribute('media'));
  disabledLinks.length = 0;
};

// Get sourceKey from Atlas3's localStorage (same browsing context)
// Falls back to server-provided default if localStorage is empty
const getSourceKey = () => {
  return localStorage.getItem('selectedVocabulary')
    || (window as any).__DEFAULT_SOURCE_KEY__
    || '';
};

const currentSourceKey = ref(getSourceKey());

// Update portalAPI when sourceKey changes
const updatePortalAPI = () => {
  if (containerRef.value && (containerRef.value as any).portalAPI) {
    (containerRef.value as any).portalAPI.studyId = currentSourceKey.value;
    // Dispatch event to notify vue-mri of dataset change
    window.dispatchEvent(new CustomEvent('alp-dataset-change'));
  }
};

// Listen for localStorage changes (when user switches vocab in Atlas3)
const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'selectedVocabulary' && e.newValue) {
    currentSourceKey.value = e.newValue;
    updatePortalAPI();
  }
};

// Intercept fetch to add x-source-key header for WebAPI calls
const originalFetch = window.fetch;
let fetchInterceptorInstalled = false;

// Helper to get token - calls pluginProps.getToken() (async function from Atlas3)
const getToken = async (): Promise<string | null> => {
  // Try pluginProps.getToken function first (from Atlas3)
  if (typeof pluginProps?.getToken === 'function') {
    try {
      const token = await pluginProps.getToken();
      if (token) return token;
    } catch (e) {
      console.error('[FetchInterceptor] Error calling pluginProps.getToken:', e);
    }
  }

  // Try pluginProps.authContext.token (legacy)
  const authToken = pluginProps?.authContext?.token;
  if (authToken) return authToken;

  // Fallback: try to get WebAPI token from localStorage or session
  // Atlas3 stores token as 'bearerToken', also check 'bearer_token' for compatibility
  const storedToken = localStorage.getItem('bearerToken') || localStorage.getItem('bearer_token') || sessionStorage.getItem('bearerToken');
  if (storedToken) return storedToken;

  return null;
};

const installFetchInterceptor = () => {
  if (fetchInterceptorInstalled) return;
  fetchInterceptorInstalled = true;
  console.log('[FetchInterceptor] Installing interceptor, pluginProps:', pluginProps, 'authContext:', pluginProps?.authContext);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const headers = new Headers(init?.headers);

    // Add Authorization header for /mri/ and /d2e/ paths
    if (url.includes('/mri/') || url.includes('/d2e/')) {
      const token = await getToken();
      console.log('[FetchInterceptor] URL matches /mri/ or /d2e/:', url, 'token:', token ? 'present' : 'missing');
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
        console.log('[FetchInterceptor] Added Authorization header');
      }
    }

    // Add x-source-key header for WebAPI calls
    if (url.includes('/WebAPI/') && currentSourceKey.value) {
      if (!headers.has('x-source-key')) {
        headers.set('x-source-key', currentSourceKey.value);
      }
    }

    return originalFetch(input, { ...init, headers });
  };
};

const uninstallFetchInterceptor = () => {
  if (fetchInterceptorInstalled) {
    window.fetch = originalFetch;
    fetchInterceptorInstalled = false;
  }
};

// Also intercept XMLHttpRequest (used by Axios) to add Authorization header
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;
let xhrInterceptorInstalled = false;

const installXHRInterceptor = () => {
  if (xhrInterceptorInstalled) return;
  xhrInterceptorInstalled = true;
  console.log('[XHRInterceptor] Installing interceptor');

  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
    (this as any)._url = typeof url === 'string' ? url : url.href;
    return originalXHROpen.apply(this, [method, url, ...args] as any);
  };

  XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
    // NOTE: XHR interceptor disabled - vue-mri handles auth via portalAPI.getToken()
    // Adding header here causes duplication since vue-mri already sets it
    return originalXHRSend.apply(this, [body]);
  };
};

const uninstallXHRInterceptor = () => {
  if (xhrInterceptorInstalled) {
    XMLHttpRequest.prototype.open = originalXHROpen;
    XMLHttpRequest.prototype.send = originalXHRSend;
    xhrInterceptorInstalled = false;
  }
};

// Watch for containerRef to be set and immediately add portalAPI
watch(containerRef, (newVal) => {
  if (newVal && !(newVal as any).portalAPI) {
    // Expose portalAPI to the vue-mri application (similar to portal's PluginContainer)
    (newVal as any).portalAPI = {
      getToken: async () => {
        // Use pluginProps.getToken() from Atlas3
        if (typeof pluginProps?.getToken === 'function') {
          try {
            return await pluginProps.getToken();
          } catch (e) {
            console.error('[portalAPI.getToken] Error:', e);
          }
        }
        // Fallback to authContext or empty string
        return pluginProps?.authContext?.token || '';
      },
      qeSvcUrl: '/d2e', // Prefix API calls with /d2e (proxied by Caddy)
      studyId: currentSourceKey.value, // Dataset ID from Atlas3 localStorage
      releaseId: '1', // Default release ID
      username: pluginProps?.username || pluginProps?.authContext?.user?.username || 'Unknown',
      toggleAtlas: (value: boolean, path: string) => {
        // Could use messageBus to navigate if needed
      },
      locale: pluginProps?.locale || 'en', // Use locale from Atlas3
      isLocal: false, // Indicates whether running locally
      debug: false,
    };
  }
}, { immediate: true });

onMounted(() => {
  // Ensure vue-mri's getPortalAPI() resolves to our container (with portalAPI).
  installContainerLookupPatch();

  // Keep Atlas3's styles winning over vue-mri's runtime-injected CSS.
  installStyleGuard();

  // Install fetch interceptor to add auth headers (for script/style loading)
  installFetchInterceptor();

  // Install XHR interceptor for Axios/XHR calls (vue-mri API calls)
  installXHRInterceptor();

  // Listen for localStorage changes from Atlas3 (vocab selection)
  window.addEventListener('storage', handleStorageChange);

  // Dispatch dataset change event for vue-mri
  const pluginEvent = new CustomEvent('alp-dataset-change');
  window.dispatchEvent(pluginEvent);

  // Simulate loading completion (the actual vue-mri app will load dynamically)
  setTimeout(() => {
    isLoading.value = false;
  }, 1000);

  // Force full height on the container and vue-mri elements
  const forceFullHeight = () => {
    if (containerRef.value) {
      // Fix the vue-main element
      const vueMain = containerRef.value.querySelector('.vue-main');
      if (vueMain) {
        (vueMain as HTMLElement).style.height = 'calc(100vh - 3.5rem)';
        (vueMain as HTMLElement).style.minHeight = 'calc(100vh - 3.5rem)';
      }

      // Fix the mri-app-vue-container element and all its parents
      const mriContainer = document.querySelector('.mri-app-vue-container');
      if (mriContainer) {
        (mriContainer as HTMLElement).style.minHeight = 'calc(100vh - 3.5rem)';
        (mriContainer as HTMLElement).style.height = 'calc(100vh - 3.5rem)';

        // Also fix all parent divs between vue-main and mri-app-vue-container
        let parent = mriContainer.parentElement;
        while (parent && !parent.classList.contains('vue-main')) {
          (parent as HTMLElement).style.height = '100%';
          (parent as HTMLElement).style.minHeight = '100%';
          parent = parent.parentElement;
        }

        return true; // Found and fixed
      } else {
        return false; // Not found yet
      }
    }
    return false;
  };

  // Try multiple times to catch async rendering (vue-mri loads dynamically)
  const attemptFix = () => {
    const fixed = forceFullHeight();
    if (!fixed) {
      // Keep trying if not found
      setTimeout(attemptFix, 200);
    }
  };

  setTimeout(attemptFix, 100);
  setTimeout(forceFullHeight, 2000); // Also try again at 2s
  setTimeout(forceFullHeight, 5000); // And at 5s

  // Watch for when .mri-app-vue-container gets added to the DOM
  const vueMain = containerRef.value?.querySelector('.vue-main');
  if (vueMain) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const mriContainer = document.querySelector('.mri-app-vue-container');
          if (mriContainer) {
            forceFullHeight();
            observer.disconnect(); // Stop observing once we've fixed it
            break;
          }
        }
      }
    });

    observer.observe(vueMain, { childList: true, subtree: true });
  }
});

onUnmounted(() => {
  // Restore patched lookup + stop guarding styles
  uninstallContainerLookupPatch();
  uninstallStyleGuard();

  // Cleanup: remove fetch interceptor
  uninstallFetchInterceptor();

  // Cleanup: remove XHR interceptor
  uninstallXHRInterceptor();

  // Cleanup: remove storage event listener
  window.removeEventListener('storage', handleStorageChange);

  // Cleanup: remove portalAPI reference
  if (containerRef.value) {
    delete (containerRef.value as any).portalAPI;
  }
});
</script>

<style>
/* Global styles for vue-mri - matching Portal's PluginContainer.scss */
.plugin-container .vue-main {
  height: calc(100vh - 3.5rem) !important;
  min-height: calc(100vh - 3.5rem) !important;
}

/* Force the vue-mri app container to take full height */
.mri-app-vue-container {
  min-height: calc(100vh - 3.5rem) !important;
  height: calc(100vh - 3.5rem) !important;
}
</style>

<style scoped>
.plugin-container {
  display: flex;
  flex-direction: column;
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
  z-index: 1000;
}

.spinner {
  width: 50px;
  height: 50px;
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

.vue-main {
  width: 100%;
  height: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
