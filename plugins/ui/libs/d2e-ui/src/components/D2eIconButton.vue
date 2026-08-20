<template>
  <v-btn
    class="d2e-icon-button"
    :class="[`d2e-icon-button--${category}`, `d2e-icon-button--${size}`]"
    :style="containerStyle"
    icon
    :aria-label="ariaLabel"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <v-icon :icon="icon" :size="iconSize" />
  </v-btn>
</template>

<script lang="ts">
// Values from design-system/icon-button.md (set 2006:843).
export const ICON_BUTTON_SIZE_MAP = {
  sm: { container: 32, icon: 16, padding: 5 },
  md: { container: 44, icon: 20, padding: 8 },
  lg: { container: 48, icon: 24, padding: 12 },
} as const;

export type D2eIconButtonSize = keyof typeof ICON_BUTTON_SIZE_MAP;
export type D2eIconButtonCategory = "primary" | "secondary" | "no-stroke";
</script>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  category?: D2eIconButtonCategory;
  size?: D2eIconButtonSize;
  icon?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  category: "no-stroke",
  size: "md",
  icon: undefined,
  ariaLabel: undefined,
  disabled: false,
});

defineEmits<{ click: [event: MouseEvent] }>();

const iconSize = computed(() => ICON_BUTTON_SIZE_MAP[props.size].icon);

const containerStyle = computed(() => ({
  width: `${ICON_BUTTON_SIZE_MAP[props.size].container}px`,
  height: `${ICON_BUTTON_SIZE_MAP[props.size].container}px`,
}));
</script>

<style scoped lang="scss">
.d2e-icon-button {
  flex: none;
  padding: 0;
  font-family: var(--d2e-font-family);
  color: var(--d2e-color-primary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  text-transform: none;

  &--no-stroke {
    border-color: transparent;

    &:hover {
      background: var(--d2e-color-primary-xtra-lightest);
    }

    &:active {
      background: var(--d2e-color-primary-lightest);
    }
  }

  &--no-stroke#{&}--lg,
  &--no-stroke#{&}--md {
    border-radius: 100px;
  }

  &--secondary {
    border-color: var(--d2e-color-primary-lighter);

    &:hover {
      background: var(--d2e-color-primary-xtra-lightest);
    }

    &:active {
      background: var(--d2e-color-primary-lightest);
    }
  }

  &--primary {
    color: var(--d2e-color-white);
    background: var(--d2e-color-primary);

    &:hover {
      background: var(--d2e-color-primary-light);
    }

    &:active {
      background: var(--d2e-color-primary);
    }
  }

  &:disabled {
    color: var(--d2e-color-neutral-light);
    background: var(--d2e-color-neutral-lighter);
    opacity: 1;
  }
}
</style>
