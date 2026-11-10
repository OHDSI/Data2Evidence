import { computed, ref } from 'vue'
import { buildSidebar, SIDEBAR_SURFACE, type PluginConfig } from '../utils/sidebar'

const FALLBACK_CONFIG: PluginConfig = {
  plugins: [
    {
      id: 'datasources',
      mountPoints: [
        {
          id: 'description',
          surface: SIDEBAR_SURFACE,
          name: 'Description',
          icon: 'mdi-file-document-outline',
          group: 'Overview',
          order: 5,
          insertBefore: 'dashboard',
        },
      ],
    },
  ],
}

function pluginsConfigUrl(): string {
  return `${window.location.pathname.replace(/[^/]*$/, '')}config/plugins.json`
}

export function useSidebarGroups(hasPermission?: (permission: string) => boolean) {
  const config = ref<PluginConfig>(FALLBACK_CONFIG)

  fetch(pluginsConfigUrl())
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((c: PluginConfig) => {
      if (Array.isArray(c?.plugins)) config.value = c
    })
    .catch(() => {})

  return computed(() => buildSidebar(config.value, hasPermission))
}
