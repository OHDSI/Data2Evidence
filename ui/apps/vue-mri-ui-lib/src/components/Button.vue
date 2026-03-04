<template>
  <button
    style="display: flex; align-items: center; justify-content: center; width: 100%"
    :class="`button ${props.variant === 'secondary' ? 'button-secondary' : ''} ${props.disabled ? 'button-disabled' : ''}`"
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
const props = defineProps<{
  text: string
  disabled?: boolean
  onClick: () => void
  variant?: 'primary' | 'secondary'
}>()
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

.button-secondary {
  background-color: var(--color-background-button-secondary-default);
  border-color: var(--color-border-button-secondary-default);
  color: var(--color-text-button-secondary-default);
}

.button-secondary:hover,
.button-secondary:focus {
  border-color: var(--color-border-button-secondary-hover);
  background-color: var(--color-background-button-secondary-hover);
  color: var(--color-text-button-secondary-hover);
}

.button-secondary.button-disabled,
.button-secondary.button-disabled:hover,
.button-secondary.button-disabled:focus,
.button-secondary.button-disabled:active {
  cursor: not-allowed;
  background-color: var(--color-background-button-secondary-disabled);
  border-color: var(--color-border-button-secondary-disabled);
  color: var(--color-text-button-secondary-disabled);
}
</style>
