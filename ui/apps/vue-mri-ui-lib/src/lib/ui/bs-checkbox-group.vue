<template>
  <div :class="['bs-checkbox-group', { 'bs-checkbox-group--stacked': stacked, 'bs-checkbox-group--inline': !stacked }]">
    <!-- Child bs-checkbox components go here -->
    <slot></slot>
  </div>
</template>

<script lang="ts">
export default {
  name: 'bs-checkbox-group',
  compatConfig: {
    MODE: 3, // Run in Vue 3 mode for proper v-model behavior
  },
}
</script>

<script setup lang="ts">
import { provide, reactive } from 'vue'

/**
 * Checkbox group component for managing multiple checkbox selections
 *
 * Provides a shared v-model array to all child bs-checkbox components.
 * Child checkboxes will automatically add/remove their values from the array.
 *
 * Usage:
 * <bs-checkbox-group v-model="selectedValues" stacked>
 *   <bs-checkbox value="option1">Option 1</bs-checkbox>
 *   <bs-checkbox value="option2">Option 2</bs-checkbox>
 * </bs-checkbox-group>
 */

type CheckboxValue = string | number | boolean

interface OptionItem {
  [key: string]: unknown
}

interface Props {
  modelValue?: Array<CheckboxValue> // Array of selected values (v-model)
  stacked?: boolean // Stack checkboxes vertically (default: false = inline)
  textField?: string // Field name for option text (if using options array)
  valueField?: string // Field name for option value (if using options array)
  options?: Array<OptionItem> // Array of option objects (alternative to slot content)
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  stacked: false,
  textField: 'text',
  valueField: 'value',
  options: () => [],
})

// Emits
const emit = defineEmits<{
  input: [value: CheckboxValue[]]
  'update:modelValue': [value: CheckboxValue[]]
  change: [value: CheckboxValue[]]
}>()

// Provide reactive checkbox group context
const checkboxGroup = reactive({
  get modelValue() {
    return props.modelValue || []
  },
  updateValue: (value: CheckboxValue[]): void => {
    // Emit events for v-model compatibility across Vue versions
    emit('input', value)
    emit('update:modelValue', value)
    emit('change', value)
  },
})

provide('checkboxGroup', checkboxGroup)
</script>

<style lang="scss" scoped>
.bs-checkbox-group {
  &--stacked {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &--inline {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }
}
</style>
