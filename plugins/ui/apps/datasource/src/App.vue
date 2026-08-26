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
         where his Description renders in the sidebar. -->
    <DatasourceCatalog
      v-else
      :token="authContext?.token ?? null"
      :on-select="openSource"
    />
  </v-theme-provider>
</template>

<script setup lang="ts">
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

defineProps<{
  name: string
  authContext: AuthContext
  hostContext?: HostContext
}>()

// Card click -> Atlas3's native Data Sources report view for the source.
// Atlas3 route: /datasources/reports/:sourceKey?/:reportType?
function openSource(sourceKey: string): void {
  window.location.hash = `#/datasources/reports/${encodeURIComponent(sourceKey)}`
}
</script>
