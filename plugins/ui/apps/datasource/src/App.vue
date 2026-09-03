<template>
  <!-- theme="light" establishes the CSS var scope (--v-theme-primary etc.). -->
  <v-theme-provider theme="light">
    <!-- Native detail: Atlas3's DataSourcesView mounts this in the
         `datasource-sidebar` surface with a sourceKey (his PR — unchanged). -->
    <DatasourceDescription
      v-if="hostContext?.sourceKey"
      :source-key="hostContext.sourceKey"
      :token="authContext?.token ?? null"
    />

    <!-- Catalog / overview: mounted as a full page (no sourceKey). Clicking a
         card opens Atlas3's native Data Sources report view for that source,
         straight to this same plugin's Description mount in the sidebar. -->
    <DatasourceCatalog
      v-else
      :token="catalogToken"
      :on-select="openSource"
    />
  </v-theme-provider>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DatasourceDescription from './views/DatasourceDescription.vue'
import DatasourceCatalog from './views/DatasourceCatalog.vue'

interface AuthContext {
  isAuthenticated: boolean
  token?: string | null
  user?: { id: number; username: string; permissions: string[] }
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
onMounted(async () => {
  if (props.getToken) catalogToken.value = (await props.getToken()) || null
})

// Atlas3 route: /datasources/:sourceKey?/:reportType?
function openSource(sourceKey: string): void {
  window.location.hash = `#/datasources/${encodeURIComponent(sourceKey)}/plugin:datasources:datasource`
}
</script>
