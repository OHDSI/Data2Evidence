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

<script lang="ts">
export default {
  name: 'app-checkbox',
  compatConfig: {
    MODE: 3, // Run in Vue 3 mode for proper v-model behavior
  },
}
</script>

<script setup lang="ts">
import { ref, watch } from 'vue'
import appLabel from './app-label.vue'

interface Props {
  value?: boolean
  disabled?: boolean
  text?: string
  checkEv?: string
  labelClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  value: false,
  disabled: false,
  text: '',
  labelClass: '',
})

const emit = defineEmits<{
  input: [value: boolean]
  'update:modelValue': [value: boolean]
  checkEv: []
}>()

// Internal reactive state
const checked = ref<boolean>(props.value)

// Watch for external value changes
watch(
  () => props.value,
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
