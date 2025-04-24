<template>
  <div class="app-router-view">
    <router-view name="sidebar"></router-view>
    <router-view class="app-router-view__view">
      <template #default="{ Component }">
        <transition name="app-router-view-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </template>
    </router-view>
  </div>
</template>
  
<script setup lang="ts">
import { provide } from 'vue'
import { RouterView } from 'vue-router'
import { workspaceApiKey, canKey as designCanKey, createWorkspaceRoutes, workspaceRoutesKey } from '@prefecthq/prefect-ui-library'
import { useApiConfig } from '@/compositions/useApiConfig'
import { useCreateCan } from '@/compositions/useCreateCan'
import { createPrefectApi } from '@/utils/api'
import { canKey } from '@/utils/permissions'
const { config } = await useApiConfig()
const { can } = useCreateCan()

const api = createPrefectApi(config)
const routes = createWorkspaceRoutes()

provide(canKey, can)
provide(designCanKey, can)
provide(workspaceApiKey, api)
provide(workspaceRoutesKey, routes)

</script>
  
<style scoped>
.app-router-view {
  display: flex;
  flex-direction: column;
}

.app-router-view__view {
  /* The 1px flex-basis is important because it allows us to use height: 100% without additional flexing */
  flex: 1 0 1px;
}

.app-router-view-fade-enter-active,
.app-router-view-fade-leave-active {
  transition: opacity 0.25s ease;
}

.app-router-view-fade-enter-from,
.app-router-view-fade-leave-to {
  opacity: 0;
}

</style>