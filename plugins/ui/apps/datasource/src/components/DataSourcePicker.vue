<template>
  <AtlasSelect
    :model-value="loading ? null : currentKey"
    :items="items"
    :loading="loading"
    :disabled="loading"
    label="Data Sources"
    item-title="label"
    item-value="value"
    variant="outlined"
    hide-details
    prepend-inner-icon="mdi-database"
    data-testid="d2e-datasource-picker"
    class="ds-picker"
    @update:model-value="onPick"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasSelect } from '@ohdsi/atlas-ui'
import type { DataSourceCardVM } from '../composables/useDataSourceCatalog'

const props = defineProps<{
  currentKey: string | null
  sources: DataSourceCardVM[]
  loading?: boolean
}>()

const emit = defineEmits<{ select: [source: DataSourceCardVM] }>()

const items = computed(() => props.sources.map(s => ({ label: s.name, value: s.id })))

function onPick(id: unknown): void {
  const source = props.sources.find(s => s.id === id)
  if (source && source.id !== props.currentKey) emit('select', source)
}
</script>

<style scoped>
.ds-picker {
  min-width: 200px;
  max-width: 280px;
}
</style>
