<template>
  <v-btn v-bind="$attrs" :disabled="disabled" color="" :loading="loading" class="v-button">
    <!-- Pass through all slots -->
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>

    <!-- Default slot content -->
    <template v-if="!$slots.default">
      <slot name="prepend"></slot>
      {{ text }}
      <slot name="append"></slot>
    </template>
  </v-btn>
</template>

<script setup lang="ts">
/**
 * VButton - A wrapper for Vuetify's VBtn component with custom styling
 *
 * This component provides a wrapper around Vuetify's v-btn that:
 * - Matches the visual style of the existing Button.vue component
 * - Passes through all props via v-bind="$attrs"
 * - Passes through all slots dynamically
 * - Provides consistent styling with CSS variables
 *
 * Usage:
 * <v-button text="Click Me" @click="handleClick" />
 * <v-button :disabled="true" text="Disabled" />
 * <v-button :loading="isLoading" text="Loading..." />
 *
 * With slots:
 * <v-button>
 *   <template #prepend>
 *     <v-icon>mdi-check</v-icon>
 *   </template>
 *   Custom Content
 * </v-button>
 *
 * All Vuetify VBtn props are supported.
 */

interface Props {
  text?: string
  disabled?: boolean
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  text: '',
  disabled: false,
  loading: false,
})
</script>

<style lang="scss" scoped>
.v-button {
  :deep(.v-btn__overlay),
  :deep(.v-btn__underlay) {
    display: none;
  }

  /* Layout */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;

  /* Shape */
  border-radius: 6px;
  border: var(--border-width-m) solid;

  /* Typography */
  font: var(--typography-mobile-button);
  text-transform: none;
  letter-spacing: normal;

  /* Spacing */
  padding: var(--space-xs) 0;

  box-shadow: none;
  cursor: pointer;
  position: relative;

  /* === Default (flat/elevated) — primary tokens === */
  background-color: var(--color-background-button-primary-default);
  border-color: var(--color-border-button-primary-default);
  color: var(--color-text-button-primary-default);

  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    background-color: var(--color-background-button-primary-hover);
    border-color: var(--color-border-button-primary-hover);
    color: var(--color-text-button-primary-hover);
  }

  &:disabled,
  &.v-btn--disabled {
    cursor: not-allowed;
    opacity: 1;
    background-color: var(--color-background-button-primary-disabled);
    border-color: var(--color-border-button-primary-disabled);
    color: var(--color-text-button-primary-disabled);
  }

  /* === Outlined — secondary tokens === */
  &.v-btn--variant-outlined {
    background-color: transparent;
    border-color: var(--color-border-button-secondary-default);
    color: var(--color-text-button-secondary-default);

    &:hover:not(:disabled),
    &:focus:not(:disabled) {
      background-color: var(--color-background-button-secondary-hover);
      border-color: var(--color-border-button-secondary-hover);
      color: var(--color-text-button-secondary-hover);
    }

    &:disabled,
    &.v-btn--disabled {
      background-color: var(--color-background-button-secondary-disabled);
      border-color: var(--color-border-button-secondary-disabled);
      color: var(--color-text-button-secondary-disabled);
    }
  }

  /* === Tonal — light-tinted primary background === */
  &.v-btn--variant-tonal {
    background-color: var(--color-primary-extra-lightest);
    border-color: transparent;
    color: var(--color-text-button-secondary-default);

    &:hover:not(:disabled),
    &:focus:not(:disabled) {
      background-color: var(--color-primary-lightest);
      border-color: transparent;
      color: var(--color-text-button-secondary-hover);
    }

    &:disabled,
    &.v-btn--disabled {
      background-color: var(--color-background-button-primary-disabled);
      border-color: transparent;
      color: var(--color-text-button-secondary-disabled);
    }
  }

  /* === Text — tertiary tokens, no border === */
  &.v-btn--variant-text {
    background-color: transparent;
    border-color: transparent;
    color: var(--color-text-button-tertiary-default);

    &:hover:not(:disabled),
    &:focus:not(:disabled) {
      background-color: var(--color-background-button-tertiary-hover);
      border-color: transparent;
      color: var(--color-text-button-tertiary-hover);
    }

    &:disabled,
    &.v-btn--disabled {
      background-color: transparent;
      border-color: transparent;
      color: var(--color-text-button-tertiary-disabled);
    }
  }

  /* === Plain — like text but opacity-based === */
  &.v-btn--variant-plain {
    background-color: transparent;
    border-color: transparent;
    color: var(--color-text-button-tertiary-default);
    opacity: 0.64;

    &:hover:not(:disabled),
    &:focus:not(:disabled) {
      background-color: transparent;
      opacity: 1;
    }

    &:disabled,
    &.v-btn--disabled {
      background-color: transparent;
      border-color: transparent;
      color: var(--color-text-button-tertiary-disabled);
      opacity: 0.38;
    }
  }
}
</style>
