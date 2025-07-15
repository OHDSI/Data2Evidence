<template>
  <div class="bs-dropdown" ref="dropdownRef">
    <button
      @click="toggle"
      @keydown="onKeydown"
      :class="triggerClasses"
      :aria-expanded="isOpen"
      :aria-haspopup="true"
      :disabled="disabled"
      type="button"
    >
      <slot name="button-content">{{ text }}</slot>
      <span v-if="!noCaret" class="bs-dropdown__caret"></span>
    </button>

    <div v-if="isOpen" class="bs-dropdown__menu" role="menu" :style="menuStyles">
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'bs-dropdown',
  compatConfig: {
    MODE: 3, // Run in Vue 3 mode for proper behavior
  },
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
  variant: { type: String, default: 'secondary' },
  size: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  noCaret: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  dropup: { type: Boolean, default: false },
  autoFlip: { type: Boolean, default: true },
  align: { type: String, default: 'center' }, // 'left', 'center', 'right'
})

const emit = defineEmits(['show', 'hide'])

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const shouldFlipUp = ref(false)

const triggerClasses = computed(() =>
  [
    'bs-dropdown__trigger',
    'btn',
    `btn-${props.variant}`,
    props.size ? `btn-${props.size}` : '',
    props.block ? 'btn-block' : '',
  ].filter(Boolean)
)

const menuStyles = computed(() => {
  const baseStyles: any = {
    position: 'absolute' as const,
    zIndex: 1000,
    minWidth: '15rem',
  }

  // Handle alignment
  if (props.align === 'left') {
    baseStyles.left = '0'
  } else if (props.align === 'right') {
    baseStyles.right = '0'
  } else {
    // center (default)
    baseStyles.left = '50%'
    baseStyles.transform = 'translateX(-50%)'
  }

  // Handle vertical positioning
  if (props.dropup || shouldFlipUp.value) {
    return {
      ...baseStyles,
      bottom: '100%',
      marginBottom: '0.125rem',
    }
  }

  // Otherwise, use normal dropdown positioning
  return {
    ...baseStyles,
    top: '100%',
    marginTop: '0.125rem',
  }
})

const toggle = () => {
  if (props.disabled) return
  if (isOpen.value) {
    close()
  } else {
    open()
  }
}

const checkFlipNeeded = () => {
  if (!props.autoFlip || props.dropup) return

  const trigger = dropdownRef.value
  if (!trigger) return

  const triggerRect = trigger.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const spaceBelow = viewportHeight - triggerRect.bottom
  const spaceAbove = triggerRect.top

  // Estimated dropdown height (could be more precise)
  const estimatedDropdownHeight = 300

  // Flip up if there's not enough space below but enough space above
  shouldFlipUp.value = spaceBelow < estimatedDropdownHeight && spaceAbove > estimatedDropdownHeight
}

const open = async () => {
  isOpen.value = true
  emit('show')
  await nextTick()

  // Check if we need to flip the dropdown
  checkFlipNeeded()

  // Focus first menu item for accessibility
  const firstItem = dropdownRef.value?.querySelector('.bs-dropdown-item') as HTMLElement
  firstItem?.focus()
}

const close = () => {
  isOpen.value = false
  shouldFlipUp.value = false
  emit('hide')
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggle()
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!isOpen.value) open()
  } else if (event.key === 'Escape') {
    close()
  }
}

const handleClickOutside = (event: Event) => {
  if (dropdownRef.value && event.target && !dropdownRef.value.contains(event.target as Node)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Expose methods for parent components
defineExpose({ open, close, toggle })
</script>

<style lang="scss">
.bs-dropdown {
  position: relative;
  display: inline-block;

  &__trigger {
    /* Inherits existing button styles from the codebase */
    display: inline-block;
  }

  &__caret {
    display: inline-block;
    margin-left: 0.255em;
    vertical-align: 0.255em;
    content: '';
    border-top: 0.3em solid;
    border-right: 0.3em solid transparent;
    border-bottom: 0;
    border-left: 0.3em solid transparent;
  }

  &__menu {
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 0.25rem;
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.175);
    padding: 0.5rem 0;
    margin: 0.125rem 0 0;
  }
}
</style>
