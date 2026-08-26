<template>
  <span class="access-status" :class="`access-status--${visualState}`" :title="tooltip">
    <span class="access-status__icon" aria-hidden="true">{{ icon }}</span>
    <span>{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DataSourceAccessState } from './types';

const props = defineProps<{ state: DataSourceAccessState }>();

const visualState = computed(() => props.state === 'write' ? 'read' : props.state);
const label = computed(() => {
  switch (visualState.value) {
    case 'read': return 'Access';
    case 'pending': return 'Pending access';
    case 'restricted': return 'Restricted';
    default: return 'No access';
  }
});
const icon = computed(() => {
  switch (visualState.value) {
    case 'read': return '✓';
    case 'pending': return '◷';
    case 'restricted': return '⊘';
    default: return '▣';
  }
});
const tooltip = computed(() => visualState.value === 'restricted'
  ? 'Access to this dataset is restricted. Contact your administrator to gain access.'
  : label.value);
</script>
