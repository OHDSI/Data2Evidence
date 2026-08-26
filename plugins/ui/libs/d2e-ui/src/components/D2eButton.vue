<template>
  <v-btn
    class="d2e-button"
    :variant="resolvedVariant.variant"
    :color="resolvedVariant.color"
    :size="resolvedSize"
    :loading="loading"
    :disabled="disabled"
    :block="block"
    :prepend-icon="prependIcon"
    :append-icon="appendIcon"
  >
    <slot />
  </v-btn>
</template>

<script lang="ts">
export const VARIANT_MAP = {
  // `mri-brand`, not the `primary` theme key: inside the portal scope
  // (.mri-app-vue-container) Bootstrap 4's scoped `.bg-primary`/`.text-primary`
  // utilities win over Vuetify's same-named utilities and render invalid
  // (transparent/blue). Bootstrap defines no `mri-brand` utilities, so the
  // theme key is safe. Same mechanism as `danger` -> `feedback-error`.
  primary: { variant: "flat", color: "mri-brand" },
  secondary: { variant: "outlined", color: "mri-brand" },
  // The design red is the existing feedback-error token (#A3293D), not the
  // Bootstrap red on the theme's `error` key.
  danger: { variant: "flat", color: "feedback-error" },
  ghost: { variant: "text", color: "mri-brand" },
} as const;

export const SIZE_MAP = { sm: "small", md: undefined, lg: "large" } as const;

export type D2eButtonVariant = keyof typeof VARIANT_MAP;
export type D2eButtonSize = keyof typeof SIZE_MAP;
</script>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  variant?: D2eButtonVariant;
  size?: D2eButtonSize;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  // Figma `Sub category` = Icon front / Icon back. Do not use v-btn's `icon`
  // prop here: it makes the button icon-only and drops the label. For an
  // icon-only control use D2eIconButton.
  prependIcon?: string;
  appendIcon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
  loading: false,
  disabled: false,
  block: false,
  prependIcon: undefined,
  appendIcon: undefined,
});

const resolvedVariant = computed(() => VARIANT_MAP[props.variant]);
const resolvedSize = computed(() => SIZE_MAP[props.size]);
</script>

<style scoped lang="scss">
.d2e-button {
  height: 40px;
  border-radius: var(--d2e-radius-md);
  font-size: var(--d2e-font-button-size);
  font-weight: var(--d2e-font-button-weight);
  line-height: var(--d2e-font-button-line-height);
  letter-spacing: var(--d2e-font-button-letter-spacing);
  text-transform: none;
}
</style>
