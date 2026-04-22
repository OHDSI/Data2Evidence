<template>
  <div v-if="!tokenReady">Loading...</div>
  <iframe
    v-else
    ref="iframeRef"
    :src="`/atlas${atlasStore.atlasPath}`"
    @load="handleIframeLoad"
    style="width: 100%; height: calc(100% - 6px); border: none"
    title="Atlas Lite"
  />
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
