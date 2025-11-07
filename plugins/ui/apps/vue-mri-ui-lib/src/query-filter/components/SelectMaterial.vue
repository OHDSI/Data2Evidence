<script lang="ts">
export default {
  compatConfig: {
    MODE: 3,
  },
}
</script>

<template>
  <div class="select-wrapper" ref="wrapper">
    <!-- Select trigger -->
    <button type="button" class="select-trigger" @click="toggle">
      <span v-if="modelValue">{{ selectedLabel }}</span>
      <span v-else class="placeholder">Select...</span>
      <span class="arrow" :class="{ open: isOpen }">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" fill="currentColor" />
        </svg>
      </span>
    </button>

    <!-- Options -->
    <transition name="fade">
      <ul v-if="isOpen" class="select-options">
        <li v-for="option in options" :key="option.value" @click="selectOption(option)" class="select-option">
          {{ option.label }}
        </li>
      </ul>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

interface Option {
  value: string | number
  label: string
}

const props = defineProps<{
  modelValue: string | number | null
  options: Option[]
  label: string
}>()

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const wrapper = ref<HTMLElement | null>(null)

const selectedLabel = computed(() => {
  return props.options.find(opt => opt.value === props.modelValue)?.label || ''
})

const toggle = () => {
  isOpen.value = !isOpen.value
}

const selectOption = (option: Option) => {
  emit('update:modelValue', option.value)
  isOpen.value = false
}

// close on outside click
const handleClickOutside = (event: MouseEvent) => {
  if (wrapper.value && !wrapper.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped>
.select-wrapper {
  position: relative;
  width: 250px;
}

/* Label */
.select-label {
  position: absolute;
  top: 12px;
  left: 12px;
  font-size: 14px;
  color: #777;
  pointer-events: none;
  transition: all 0.2s ease;
  background: white;
  padding: 0 4px;
}

/* Trigger */
.select-trigger {
  width: 100%;
  padding: 7px 32px 7px 10px;
  font-size: 14px;
  text-align: left;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  position: relative;
  min-height: 32px;
  height: 100%;
}
.select-trigger:focus,
.select-trigger:hover {
  border-color: var(--color-primary-light, #1976d2);
}

/* Placeholder */
.placeholder {
  color: #aaa;
}

/* Dropdown arrow */
.arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%) rotate(0deg);
  transition: transform 0.2s ease;
  font-size: 10px;
}
.arrow.open {
  transform: translateY(-50%) rotate(180deg);
}

/* Options dropdown */
.select-options {
  position: absolute;
  z-index: 10;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  list-style: none;
  padding: 4px 0;
}
.select-option {
  padding: 6px 10px;
  cursor: pointer;
  font-size: 14px;
}
.select-option:hover {
  background: #f8f9fa;
}

/* Fade animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

