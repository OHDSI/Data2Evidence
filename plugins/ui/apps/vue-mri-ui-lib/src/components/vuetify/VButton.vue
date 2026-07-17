<template>
  <v-btn v-bind="$attrs" :disabled="disabled" color="" :loading="loading" class="v-button">
    <!-- Pass through all slots -->
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
    <template v-if="!$slots.default">
      {{ text }}
    </template>
  </v-btn>
</template>

<script setup lang="ts">
/**
 * VButton — shared Vuetify 3 button wrapper for vue-mri-ui-lib.
 *
 * All Vuetify VBtn props are supported via v-bind="$attrs" (variant, color,
 * size, density, block, icon, href, …). Only a few props are declared
 * explicitly for type-safety; everything else passes through automatically.
 *
 * ## Basic usage
 * ```vue
 * <VButton @click="handleClick">Save</VButton>
 * <VButton text="Save" @click="handleClick" />
 * <VButton :disabled="isSaving" @click="save">Save</VButton>
 * <VButton :loading="isSaving" @click="save">Save</VButton>
 * ```
 *
 * ## Variants (passed through to v-btn)
 * ```vue
 * <!-- Default: flat primary (set in plugins/vuetify.ts defaults) -->
 * <VButton @click="fn">Primary Action</VButton>
 *
 * <!-- Outlined / secondary -->
 * <VButton variant="outlined" @click="fn">Secondary</VButton>
 *
 * <!-- Text / link-like -->
 * <VButton variant="text" color="primary" @click="fn">Link style</VButton>
 * ```
 *
 * ## Full-width
 * ```vue
 * <VButton block @click="fn">Full width</VButton>
 * ```
 *
 * ## With icons (Vuetify prepend/append slots)
 * ```vue
 * <VButton @click="fn">
 *   <template #prepend><AddIcon /></template>
 *   New item
 * </VButton>
 * ```
 *
 * ## Replacing Button.vue (old API)
 * Old: `<Button :text="label" :onClick="fn" :disabled="d" />`
 * New: `<VButton :disabled="d" @click="fn">{{ label }}</VButton>`
 *
 * ## Replacing ButtonMaterial.vue (old API)
 * Old: `<ButtonMaterial variant="text" color="primary" @button-click="fn"><template #startIcon><Ico /></template>Label</ButtonMaterial>`
 * New: `<VButton variant="text" color="primary" @click="fn"><template #prepend><Ico /></template>Label</VButton>`
 */

interface Props {
  /** Text content — alternative to the default slot for simple labels. */
  text?: string
  /** Disables the button and applies disabled styling. */
  disabled?: boolean
  /** Shows a loading spinner inside the button. */
  loading?: boolean
  /**
   * Makes the button expand to 100% of its container width.
   * Equivalent to Vuetify's `block` prop on VBtn.
   * Declared here for discoverability; passes through via $attrs automatically.
   */
  block?: boolean
}

withDefaults(defineProps<Props>(), {
  text: '',
  disabled: false,
  loading: false,
  block: false,
})
</script>

<style lang="scss" scoped>
.v-button {
  :deep(.v-btn__overlay),
  :deep(.v-btn__underlay) {
    display: none;
  }

  /* Layout — width is NOT forced; use the `block` prop for full-width. */
  display: flex;
  align-items: center;
  justify-content: center;

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
}
</style>
