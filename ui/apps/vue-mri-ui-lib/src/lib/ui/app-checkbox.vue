<template>
  <div class="app-checkbox">
    <div
      v-on:keyup="keymonitor"
      v-bind:class="['app-checkbox-container', { 'app-checkbox-checked': checked, 'app-checkbox-disabled': disabled }]"
      @click="toggleCheckbox"
      tabindex="0"
    >
      <input type="checkbox" :checked="checked" />
    </div>
    <appLabel :text="text" :cssClass="labelClass"></appLabel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import appLabel from './app-label.vue'

interface Props {
  value?: boolean
  modelValue?: boolean
  disabled?: boolean
  text?: string
  checkEv?: string
  labelClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  value: undefined,
  modelValue: undefined,
  disabled: false,
  text: '',
  labelClass: '',
})

const emit = defineEmits<{
  input: [value: boolean]
  'update:modelValue': [value: boolean]
  checkEv: []
}>()

// Merge both props - modelValue takes precedence for Vue 2/3 compat
const mergedValue = computed(() => {
  return props.modelValue !== undefined ? props.modelValue : (props.value ?? false)
})

// Internal reactive state
const checked = ref<boolean>(mergedValue.value)

// Watch for external value changes
watch(
  mergedValue,
  val => {
    if (val !== checked.value) {
      checked.value = val
    }
  },
  { immediate: true } // Ensures sync even if value changes during setup
)

const toggleCheckbox = () => {
  if (props.disabled) return

  checked.value = !checked.value

  // Dual emission for Vue 2/3 compatibility during compat mode
  // Once compat mode is disabled, only 'update:modelValue' will be needed
  emit('input', checked.value) // Vue 2 pattern
  emit('update:modelValue', checked.value) // Vue 3 pattern
  emit('checkEv')
}

const keymonitor = (event: KeyboardEvent) => {
  const key = event.key
  if (key === ' ' || key === 'Spacebar') {
    event.preventDefault() // Prevent page scroll
    toggleCheckbox()
  }
}
</script>
