<template>
  <span class="ds-meta"><AtlasIcon
    :icon="icon"
    size="small"
  /><slot /></span>
</template>

<script setup lang="ts">
import { AtlasIcon } from '@ohdsi/atlas-ui'

defineProps<{ icon: string }>()
</script>

<style scoped>
.ds-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--ds-font-body, 'IBM Plex Sans', sans-serif);
  font-weight: 400;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ds-text, #595757);
  min-width: 0;
}
.ds-meta :deep(svg) { color: var(--ds-text, #595757); flex: none; }
</style>
