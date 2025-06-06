<script lang="ts">
export default {
  name: 'QueryFilterChip'
}
</script>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import { QueryFilterChip } from '../models/QueryFilterModel'

const props = defineProps<{
  chip: QueryFilterChip
  removable?: boolean
  variant?: 'default' | 'primary' | 'secondary'
}>()

const emit = defineEmits(['remove'])

const chipClasses = computed(() => {
  const classes: Record<string, boolean> = {
    [`query-filter-chip--${props.variant || 'default'}`]: true,
    'query-filter-chip--removable': props.removable ?? true,
  }

  if (props.chip.color) {
    classes[`query-filter-chip--${props.chip.color}`] = true
  }

  return classes
})
</script>

<template>
  <div class="query-filter-chip" :class="chipClasses">
    <span class="query-filter-chip__label">{{ chip.label }}</span>
    <button
      v-if="removable"
      class="query-filter-chip__remove"
      @click="$emit('remove')"
      :aria-label="`Remove ${chip.label}`"
    >
      <i class="icon icon-times"></i>
    </button>
  </div>
</template>

<style lang="scss" scoped>
@import '../styles/QueryFilterChip';
</style>