<template>
  <span :class="badgeClasses" class="bs-badge">
    <slot>{{ text }}</slot>
  </span>
</template>

<script lang="ts">
export default {
  name: 'BsBadge',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'light' | 'dark'
  text?: string
  pill?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  text: '',
  pill: false,
})

const badgeClasses = computed(() => [
  `bs-badge--${props.variant}`,
  {
    'bs-badge--pill': props.pill,
  },
])
</script>

<style lang="scss" scoped>
.bs-badge {
  display: inline-block;
  padding: 0.25em 0.4em;
  font-size: 0.75em;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
  vertical-align: baseline;
  border-radius: 0.25rem;

  // Empty badges collapse
  &:empty {
    display: none;
  }

  // Pill variation
  &--pill {
    border-radius: 10rem;
  }

  // Variant styles based on Bootstrap patterns
  &--primary {
    color: #fff;
    background-color: #0d6efd;
  }

  &--secondary {
    color: #fff;
    background-color: #6c757d;
  }

  &--success {
    color: #fff;
    background-color: #198754;
  }

  &--warning {
    color: #000;
    background-color: #ffc107;
  }

  &--danger {
    color: #fff;
    background-color: #dc3545;
  }

  &--info {
    color: #000;
    background-color: #0dcaf0;
  }

  &--light {
    color: #000;
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
  }

  &--dark {
    color: #fff;
    background-color: #212529;
  }
}

// Links inside badges should inherit color
.bs-badge a {
  color: inherit;
  text-decoration: none;

  &:hover,
  &:focus {
    color: inherit;
    text-decoration: underline;
  }
}
</style>
