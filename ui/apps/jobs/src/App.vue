<template>
  <div class="app" data-teleport-target="app">
    <suspense>
      <AppRouterView />
    </suspense>
  </div>
</template>

<script setup lang="ts">
import { useColorTheme } from '@prefecthq/prefect-design';
import AppRouterView from '@/views/AppRouterView.vue'

const { setTheme } = useColorTheme()
setTheme('light')
</script>

<style scoped>
.app {
  @apply h-[calc(100vh-80px)];
  /* background-color: var(--color-neutral-lightest); */
}
</style>
