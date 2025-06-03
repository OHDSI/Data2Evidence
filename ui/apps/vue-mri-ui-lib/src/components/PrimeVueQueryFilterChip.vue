<script lang="ts">
export default {
  name: 'PrimeVueQueryFilterChip'
}
</script>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import { QueryFilterChip } from '../lib/models/QueryFilterModel'

const props = defineProps<{
  chip: QueryFilterChip
  removable?: boolean
  variant?: 'default' | 'primary' | 'secondary'
}>()

const emit = defineEmits(['remove'])

const chipSeverity = computed(() => {
  if (props.chip.color) {
    const colorMap: Record<string, string> = {
      blue: 'info',
      green: 'success',
      red: 'danger',
      yellow: 'warning',
      purple: 'info',
      gray: 'secondary',
    }
    return colorMap[props.chip.color] || 'info'
  }

  const variantMap = {
    default: 'info',
    primary: 'info',
    secondary: 'secondary',
  }
  
  return variantMap[props.variant || 'default']
})

const handleRemove = () => {
  emit('remove')
}
</script>

<template>
  <Chip 
    :label="chip.label"
    :removable="removable ?? true"
    @remove="handleRemove"
    class="primevue-query-filter-chip"
    :class="`p-chip-${chipSeverity}`"
  >
    <template #icon>
      <i class="pi pi-pencil-alt chip-icon"></i>
    </template>
  </Chip>
</template>

<style lang="scss" scoped>
.primevue-query-filter-chip {
  font-size: 13px;
  max-width: 200px;
  
  :deep(.p-chip-text) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chip-icon {
    font-size: 10px;
    margin-right: 4px;
  }

  // Custom colors for chips
  &.p-chip-info {
    background: #e0f2fe;
    color: #0369a1;
    border: 1px solid #7dd3fc;

    :deep(.pi-times) {
      color: #0369a1;
    }
  }

  &.p-chip-success {
    background: #d1fae5;
    color: #065f46;
    border: 1px solid #6ee7b7;

    :deep(.pi-times) {
      color: #065f46;
    }
  }

  &.p-chip-danger {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;

    :deep(.pi-times) {
      color: #991b1b;
    }
  }

  &.p-chip-warning {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fcd34d;

    :deep(.pi-times) {
      color: #92400e;
    }
  }

  &.p-chip-secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;

    :deep(.pi-times) {
      color: #374151;
    }
  }
}
</style>