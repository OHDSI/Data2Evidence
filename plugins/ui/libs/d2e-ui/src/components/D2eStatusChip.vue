<template>
  <span class="d2e-status-chip" :style="resolved">
    <v-icon v-if="icon" :icon="icon" size="16" />
    <span class="d2e-status-chip__label">
      <slot>{{ label }}</slot>
    </span>
  </span>
</template>

<script lang="ts">
// Values from design-system/status-chip.md (Chip set 2129:3329 + dataset
// status 2032:2333). "Possitive" is the Figma spelling; code uses `positive`.
export const STATUS_CHIP_VARIANT_MAP = {
  positive: {
    background: "var(--d2e-color-success-light)",
    color: "var(--d2e-color-success)",
  },
  warning: {
    background: "var(--d2e-color-warning-light)",
    color: "var(--d2e-color-warning-text)",
  },
  negative: {
    background: "var(--d2e-color-alarm-light)",
    color: "var(--d2e-color-alarm)",
  },
  neutral: {
    background: "var(--d2e-color-neutral-lightest)",
    color: "var(--d2e-color-neutral)",
  },
  multiselect: {
    background: "var(--d2e-color-support-blue-light)",
    color: "var(--d2e-color-primary)",
  },
  "have-access": {
    background: "var(--d2e-color-success-light)",
    color: "var(--d2e-color-success)",
  },
  "pending-access": {
    background: "var(--d2e-color-warning-light)",
    color: "var(--d2e-color-warning-text)",
  },
  locked: {
    background: "var(--d2e-color-alarm-light)",
    color: "var(--d2e-color-alarm)",
  },
} as const;

export type D2eStatusChipVariant = keyof typeof STATUS_CHIP_VARIANT_MAP;
</script>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  variant?: D2eStatusChipVariant;
  label?: string;
  icon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "positive",
  label: undefined,
  icon: undefined,
});

const resolved = computed(() => STATUS_CHIP_VARIANT_MAP[props.variant]);
</script>

<style scoped lang="scss">
.d2e-status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--d2e-spacing-xxs);
  height: 25px;
  padding: var(--d2e-spacing-xxs);
  border-radius: 100px;
  font-family: var(--d2e-font-family);
  font-size: var(--d2e-font-caption1-size);
  font-weight: var(--d2e-font-caption1-weight);
  line-height: var(--d2e-font-caption1-line-height);
  letter-spacing: var(--d2e-font-caption1-letter-spacing);
  white-space: nowrap;

  &__label {
    line-height: 1;
  }
}
</style>
