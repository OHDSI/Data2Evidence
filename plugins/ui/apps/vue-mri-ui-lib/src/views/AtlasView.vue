<template>
  <div class="atlas-view-container">
    <iframe
      v-if="tokenReady"
      ref="iframeRef"
      :src="`/atlas${atlasStore.atlasPath}`"
      @load="handleIframeLoad"
      class="atlas-iframe"
      title="Atlas Lite"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAtlasStore } from '@/stores/atlas'
import { useAtlasIframe } from '@/composables/useAtlasIframe'

const iframeRef = ref<HTMLIFrameElement | null>(null)
const atlasStore = useAtlasStore()
const { tokenReady, preloadToken, handleIframeLoad } = useAtlasIframe(iframeRef)

onMounted(preloadToken)
</script>

<style scoped>
.atlas-view-container {
  position: absolute;
  inset: 0;
  background: white;
  z-index: 50;
  height: 100%;
  width: 100%;
}

.atlas-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
