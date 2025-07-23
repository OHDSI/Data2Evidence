<template>
  <div class="bs-checkbox">
    <!-- Custom checkbox input (hidden native input for accessibility) -->
    <div
      v-on:keyup="handleKeyup"
      v-bind:class="[
        'bs-checkbox__input',
        { 'bs-checkbox__input--checked': isChecked, 'bs-checkbox__input--disabled': disabled },
      ]"
      @click="handleClick"
      tabindex="0"
    >
      <input type="checkbox" :checked="isChecked" :name="name" style="display: none" />
    </div>
    <!-- Optional label (text prop or slot content) -->
    <label v-if="hasLabel" class="bs-checkbox__label" @click="handleClick">
      <slot>{{ text }}</slot>
    </label>
  </div>
</template>

<script lang="ts">
export default {
  name: 'bs-checkbox',
  compatConfig: {
    MODE: 3, // Run in Vue 3 mode for proper v-model behavior
  },
}
</script>

<script setup lang="ts">
import { computed, useSlots, inject } from 'vue'

/**
 * Checkbox component with group support and dropdown compatibility
 *
 * Uses Vue 3 provide/inject pattern for group coordination:
 * - Group provides reactive context with modelValue array and updateValue function
 * - Individual checkboxes inject this context to sync their state with the group
 *
 * Usage patterns:
 * 1. Inside bs-checkbox-group: Uses inject to get group's v-model array
 * 2. Standalone with :checked: Visual indicator only, emits menu-item-click for parent handling
 */

type CheckboxValue = string | number | boolean

interface MenuItem {
  key: string
  text?: string
  [key: string]: unknown
}

interface Props {
  value?: CheckboxValue // Value to add/remove from group array
  checked?: boolean // For standalone checkboxes - visual state only
  name?: string | null // Form field name
  disabled?: boolean // Disable interaction
  text?: string // Label text (alternative to slot)
  menuItem?: MenuItem // Menu item data for standalone checkboxes
}

const props = withDefaults(defineProps<Props>(), {
  value: true,
  checked: false,
  name: null,
  disabled: false,
  text: '',
  menuItem: null,
})

// Events emitted by this component
const emit = defineEmits<{
  input: [value: boolean] // v-model compatibility (legacy)
  'update:modelValue': [value: boolean] // v-model compatibility (modern)
  change: [value: boolean] // Change event for compatibility
  'menu-item-click': [item: MenuItem] // Custom event for standalone checkboxes
}>()

// Composables
const slots = useSlots()

// Inject checkbox group context if available (null for standalone checkboxes)
const checkboxGroup = inject('checkboxGroup', null)

// Computed Properties
const isChecked = computed((): boolean => {
  // Checkbox group context (for checkboxes inside bs-checkbox-group)
  if (checkboxGroup && checkboxGroup.modelValue) {
    if (Array.isArray(checkboxGroup.modelValue)) {
      return checkboxGroup.modelValue.includes(props.value)
    }
    return checkboxGroup.modelValue === props.value || checkboxGroup.modelValue === true
  }

  // checked prop for standalone checkboxes
  return props.checked
})

const hasLabel = computed((): boolean => {
  return !!props.text || !!slots.default
})

// Event Handlers
const toggleCheckbox = (): void => {
  if (props.disabled) return

  // Checkbox group handling: Update the group's array by adding/removing this value
  if (checkboxGroup) {
    const currentArray = checkboxGroup.modelValue || []
    const newArray = [...currentArray]
    const index = newArray.indexOf(props.value)

    if (index > -1) {
      newArray.splice(index, 1) // Remove if already selected
    } else {
      newArray.push(props.value) // Add if not selected
    }

    checkboxGroup.updateValue(newArray)
    return
  }

  // Standalone checkbox: Just emit events (visual state handled by :checked prop)
  const newValue = !isChecked.value
  emit('input', newValue)
  emit('update:modelValue', newValue)
  emit('change', newValue)
}

const handleClick = (event: Event): void => {
  // Always stop propagation to prevent dropdown from closing
  // This is crucial for dropdowns containing checkboxes
  event.stopPropagation()

  // Update checkbox state
  toggleCheckbox()

  // For standalone checkboxes: notify parent component about menu item selection
  // This replaces the dropdown item click that we prevented with stopPropagation
  if (!checkboxGroup && props.menuItem) {
    emit('menu-item-click', props.menuItem)
  }
}

const handleKeyup = (event: KeyboardEvent): void => {
  if (event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault()
    toggleCheckbox()
  }
}
</script>

<style lang="scss" scoped>
.bs-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  cursor: pointer;

  &__input {
    border: 1px solid #ccc;
    border-radius: 3px;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #fff;
    cursor: pointer;
    flex-shrink: 0;
    margin-top: 2px;

    &:focus {
      outline: 1px dotted #666;
      outline-offset: 1px;
    }

    &--checked {
      background-color: #fff;
      border-color: #666666;

      &::before {
        content: '✓';
        color: #333;
        font-size: 12px;
        font-weight: bold;
        line-height: 1;
      }
    }

    &--disabled {
      background-color: #f5f5f5;
      border-color: #ddd;
      cursor: not-allowed;
      opacity: 0.6;

      &.bs-checkbox__input--checked {
        background-color: #f5f5f5;
        border-color: #ddd;

        &::before {
          color: #999;
        }
      }
    }
  }

  &__label {
    cursor: pointer;
    user-select: none;
    margin: 0;
    line-height: 1.4;
    font-size: 14px;
    color: #333;
    flex: 1;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  &--disabled {
    cursor: not-allowed;

    .bs-checkbox__label {
      cursor: not-allowed;
      opacity: 0.6;
      color: #999;
    }
  }
}
</style>
