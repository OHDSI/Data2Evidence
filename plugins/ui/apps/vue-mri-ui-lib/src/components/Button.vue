<template>
  <button
    style="display: flex; align-items: center; justify-content: center; width: 100%"
    :class="`button ${props.disabled ? 'button-disabled' : ''}`"
    type="submit"
    @click="onClick"
    :disabled="props.disabled"
  >
    <slot name="icon-left"></slot>
    <div>{{ props.text }}</div>
    <slot name="icon-right"></slot>
  </button>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
const props = defineProps<{ text: string; disabled?: boolean; onClick: () => void }>()
</script>

<style lang="css" scoped>
.button {
  border-radius: 6px;
  padding: var(--space-xs) 0;
  border: var(--border-width-m) solid;
  border-color: var(--color-border-button-primary-default);
  background-color: var(--color-background-button-primary-default);
  color: var(--color-text-button-primary-default);
  font: var(--typography-mobile-button);
  cursor: pointer;
  position: relative;
}

.button:hover,
.button:focus {
  border-color: var(--color-border-button-primary-hover);
  background-color: var(--color-background-button-primary-hover);
  color: var(--color-text-button-primary-hover);
}

.button-disabled,
.button-disabled:hover,
.button-disabled:focus,
.button-disabled:active {
  cursor: not-allowed;
  background-color: var(--color-background-button-primary-disabled);
  border-color: var(--color-border-button-primary-disabled);
  color: var(--color-text-button-primary-disabled);
}
</style>

