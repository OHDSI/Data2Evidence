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

const containerRef = ref<HTMLElement | null>(null);
const isLoading = ref(true);

const pluginProps = inject<PluginProps>('pluginProps');

const authContext = pluginProps?.authContext;
const messageBus = pluginProps?.messageBus;

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

const installFetchInterceptor = () => {
  if (fetchInterceptorInstalled) return;
  fetchInterceptorInstalled = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // Only intercept WebAPI calls and only if we have a sourceKey
    if (url.includes('/WebAPI/') && currentSourceKey.value) {
      const headers = new Headers(init?.headers);
      // Add the source key header if not already present
      if (!headers.has('x-source-key')) {
        headers.set('x-source-key', currentSourceKey.value);
      }
      init = { ...init, headers };
    }

    return originalFetch(input, init);
  };
};

const uninstallFetchInterceptor = () => {
  if (fetchInterceptorInstalled) {
    window.fetch = originalFetch;
    fetchInterceptorInstalled = false;
  }
};

// Watch for containerRef to be set and immediately add portalAPI
watch(containerRef, (newVal) => {
  if (newVal && !(newVal as any).portalAPI) {
    // Expose portalAPI to the vue-mri application (similar to portal's PluginContainer)
    (newVal as any).portalAPI = {
      getToken: async () => authContext?.token || '',
      qeSvcUrl: '', // Empty - API calls should not be prefixed
      studyId: currentSourceKey.value, // Dataset ID from Atlas3 localStorage
      releaseId: '1', // Default release ID
      username: authContext?.user?.username || 'Unknown',
      toggleAtlas: (value: boolean, path: string) => {
        // Could use messageBus to navigate if needed
      },
      locale: 'en', // Default locale
      isLocal: false, // Indicates whether running locally
      debug: false,
    };
  }
}, { immediate: true });

onMounted(() => {
  // Install fetch interceptor to add x-source-key header
  installFetchInterceptor();

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
  // Cleanup: remove fetch interceptor
  uninstallFetchInterceptor();

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
