<template>
  <v-tooltip
    :text="text"
    :location="location"
    :activator="activator"
    :disabled="disabled"
    :eager="false"
    max-width="240"
    content-class="d2e-tooltip"
  >
    <template v-if="$slots.activator" #activator="slotProps">
      <slot name="activator" v-bind="slotProps" />
    </template>
    <template v-if="$slots.default" #default>
      <slot />
    </template>
  </v-tooltip>
</template>

<script setup lang="ts">
import { VTooltip } from "vuetify/components";

interface Props {
  text?: string;
  location?: "top" | "bottom" | "start" | "end";
  activator?: string;
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  text: undefined,
  location: "top",
  activator: undefined,
  disabled: false,
});
</script>

<style lang="scss">
.v-overlay__content.d2e-tooltip {
  padding: var(--d2e-spacing-xs) var(--d2e-spacing-xs-s);
  background: var(--d2e-color-white);
  color: var(--d2e-color-neutral);
  border-radius: var(--d2e-radius-sm);
  box-shadow: 0 0 10px rgb(0 0 0 / 22%);
  font-family: var(--d2e-font-family);
  font-size: var(--d2e-font-caption1-size);
  font-weight: var(--d2e-font-caption1-weight);
  line-height: var(--d2e-font-caption1-line-height);
  overflow-wrap: anywhere;
  opacity: 1;
}
</style>
