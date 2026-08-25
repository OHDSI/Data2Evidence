<template>
  <!-- No with-background: DatasourceDescription mounts inside Atlas3's own
       white AtlasCard (see DataSourcesView.vue), and a theme background fill
       here was showing through as an unwanted light-gray tint. theme="light"
       alone still establishes the CSS var scope (--v-theme-primary etc.). -->
  <v-theme-provider theme="light">
    <DatasourceDescription
      v-if="hostContext?.sourceKey"
      :source-key="hostContext.sourceKey"
      :token="authContext?.token ?? null"
    />
  </v-theme-provider>
</template>

<script setup lang="ts">
import DatasourceDescription from './views/DatasourceDescription.vue'

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
</script>
