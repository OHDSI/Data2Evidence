<script setup lang="ts">
import ChevronIcon from './icons/ChevronIcon.vue'

const props = withDefaults(
  defineProps<{
    direction: 'up' | 'down'
    disabled?: boolean
    title?: string
  }>(),
  {
    disabled: false,
    title: '',
  }
)

const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  emit('click')
}
</script>

<template>
  <button @click="handleClick" class="btn-chevron" :disabled="disabled" :title="title">
    <ChevronIcon class="chevron-icon" :direction="direction" />
  </button>
</template>

<style scoped>
.btn-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--color-ui-medium-text, #666);
}

.btn-chevron:focus {
  outline: 2px solid var(--color-focus, #005483);
  outline-offset: 2px;
}
.btn-chevron:hover {
  color: var(--color-background-button-primary-hover);
}

.btn-chevron:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.chevron-icon {
  width: 24px;
  height: 24px;
}
</style>
