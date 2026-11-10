<template>
  <DataSourcePicker
    :current-key="currentKey"
    :sources="opts.sources.value"
    :loading="opts.loading.value"
    @select="onSelect"
  />
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import DataSourcePicker from './DataSourcePicker.vue'
import { useDataSourceOptions } from '../composables/useDataSourceOptions'
import type { DataSourceCardVM } from '../composables/useDataSourceCatalog'

const props = defineProps<{
  currentKey: string | null
  token: string | null
  onSelect: (source: DataSourceCardVM) => void
  onUnavailable?: (source: DataSourceCardVM) => void
  onFallback?: () => void
}>()

const opts = useDataSourceOptions(() => props.token)

const current = computed(() => opts.sources.value.find(s => s.id === props.currentKey) ?? null)
watch(current, source => {
  if (source && source.access !== 'approved') props.onUnavailable?.(source)
}, { immediate: true })

watch([opts.loading, current], ([loading, source]) => {
  if (!loading && !source) props.onFallback?.()
}, { immediate: true })
</script>
