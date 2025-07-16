<template>
  <div
    v-if="isVisible"
    :class="alertClasses"
    class="app-alert"
    role="alert"
    :aria-live="ariaLive"
    :aria-atomic="ariaAtomic"
  >
    <div class="app-alert__content">
      <slot>{{ text }}</slot>
    </div>
    <button v-if="dismissible" @click="dismiss" class="app-alert__close" type="button" :aria-label="closeLabel">
      ×
    </button>
  </div>
</template>

<script lang="ts">
export default {
  name: 'AppAlert',
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { computed, watch, onMounted, ref } from 'vue'

interface Props {
  modelValue?: boolean
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'light' | 'dark' | 'error'
  text?: string
  dismissible?: boolean
  autoDismiss?: number
  show?: boolean
  closeLabel?: string
  ariaLive?: 'polite' | 'assertive' | 'off'
  ariaAtomic?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: true,
  variant: 'info',
  text: '',
  dismissible: false,
  autoDismiss: 0,
  show: undefined,
  closeLabel: 'Close',
  ariaLive: 'assertive',
  ariaAtomic: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  dismissed: []
}>()

const autoDismissTimer = ref<NodeJS.Timeout | null>(null)

const alertClasses = computed(() => {
  // Map 'error' to 'danger' for Bootstrap compatibility
  const variant = props.variant === 'error' ? 'danger' : props.variant
  return [
    `app-alert--${variant}`,
    {
      'app-alert--dismissible': props.dismissible,
    },
  ]
})

const dismiss = () => {
  emit('update:modelValue', false)
  emit('dismissed')
}

// Handle legacy 'show' prop for Bootstrap Vue compatibility
const isVisible = computed(() => {
  if (props.show !== undefined) {
    return props.show
  }
  return props.modelValue
})

const setupAutoDismiss = () => {
  if (autoDismissTimer.value) {
    clearTimeout(autoDismissTimer.value)
  }

  if (props.autoDismiss > 0 && isVisible.value) {
    autoDismissTimer.value = setTimeout(() => {
      dismiss()
    }, props.autoDismiss)
  }
}

// Watch for visibility changes
watch(
  () => isVisible.value,
  newValue => {
    if (newValue) {
      setupAutoDismiss()
    } else if (autoDismissTimer.value) {
      clearTimeout(autoDismissTimer.value)
      autoDismissTimer.value = null
    }
  }
)

onMounted(() => {
  setupAutoDismiss()
})
</script>

<style lang="scss" scoped>
.app-alert {
  position: relative;
  padding: 0.75rem 1.25rem;
  margin-bottom: 1rem;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  &__content {
    flex: 1;
  }

  &__close {
    background: none;
    border: none;
    padding: 0;
    margin-left: 1rem;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1;
    color: inherit;
    opacity: 0.5;
    cursor: pointer;

    &:hover,
    &:focus {
      opacity: 0.75;
    }
  }

  // Variant styles based on Bootstrap 5 patterns
  &--primary {
    color: #084298;
    background-color: #cfe2ff;
    border-color: #b6d4fe;
  }

  &--secondary {
    color: #41464b;
    background-color: #e2e3e5;
    border-color: #d3d6d8;
  }

  &--success {
    color: #0f5132;
    background-color: #d1eddb;
    border-color: #badbcc;
  }

  &--warning {
    color: #664d03;
    background-color: #fff3cd;
    border-color: #ffecb5;
  }

  &--danger {
    color: #fff;
    background-color: #c00000;
    border-color: #fff;
  }

  &--info {
    color: #055160;
    background-color: #d1ecf1;
    border-color: #bee5eb;
  }

  &--light {
    color: #636464;
    background-color: #fefefe;
    border-color: #fdfdfe;
  }

  &--dark {
    color: #141619;
    background-color: #d3d3d4;
    border-color: #bcbebf;
  }
}
</style>
