<template>
  <svg :class="['chevron-icon', direction]" width="16" height="16" viewBox="0 0 24 24">
    <path :d="pathD" fill="currentColor" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  direction: 'up' | 'down'
}>()

const pathD = computed(() => {
  return props.direction === 'up'
    ? 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z'
    : 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z'
})
</script>

