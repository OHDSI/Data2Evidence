<template>
  <!-- theme="light" establishes the CSS var scope (--v-theme-primary etc.). -->
  <v-theme-provider theme="light">
    <!-- Native detail: Atlas3's DataSourcesView mounts this in the
         `datasource-sidebar` surface with a sourceKey (his PR — unchanged). -->
    <DataSourceDescription
      v-if="hostContext?.sourceKey"
      :source-key="hostContext.sourceKey"
      :token="authContext?.token ?? null"
    />

    <DataSourcePage
      v-else-if="pluginSourceKey && tokenReady"
      :source-key="pluginSourceKey"
      :token="catalogToken"
      :has-permission="authContext?.hasPermission"
    />

    <DataSourceCatalog
      v-else-if="!pluginSourceKey"
      :token="catalogToken"
      :on-select="openSource"
    />
  </v-theme-provider>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import DataSourceDescription from './views/DataSourceDescription.vue'
import DataSourceCatalog from './views/DataSourceCatalog.vue'
import DataSourcePage from './views/DataSourcePage.vue'
import { DESCRIPTION_REPORT, parseAtlasReportType, parsePluginSourceKey, pluginSourceHash } from './utils/routes'

interface AuthContext {
  isAuthenticated: boolean
  token?: string | null
  user?: { id: number; username: string; permissions: string[] }
  hasPermission?: (permission: string) => boolean
}
interface HostContext {
  surface: string
  itemId: string
  locale: string
  permissions: string[]
  sourceKey?: string
}

const props = defineProps<{
  name: string
  authContext: AuthContext
  hostContext?: HostContext
  getToken?: () => Promise<string>
}>()

const catalogToken = ref<string | null>(props.authContext?.token ?? null)
const tokenReady = ref(!props.getToken)
const pluginSourceKey = ref<string | null>(parsePluginSourceKey(window.location.hash))

function syncRoute(): void {
  const key = parsePluginSourceKey(window.location.hash)
  if (key === pluginSourceKey.value) return
  pluginSourceKey.value = key
  window.scrollTo(0, 0)
}

onMounted(async () => {
  if (props.hostContext?.sourceKey && parseAtlasReportType(window.location.hash) === DESCRIPTION_REPORT) {
    window.location.replace(pluginSourceHash(props.hostContext.sourceKey))
  }
  window.addEventListener('hashchange', syncRoute)
  window.addEventListener('popstate', syncRoute)
  if (props.getToken) catalogToken.value = (await props.getToken()) || null
  tokenReady.value = true
})
onBeforeUnmount(() => {
  window.removeEventListener('hashchange', syncRoute)
  window.removeEventListener('popstate', syncRoute)
})

function openSource(sourceKey: string): void {
  window.location.hash = pluginSourceHash(sourceKey)
}
</script>
