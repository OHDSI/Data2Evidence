<template>
  <v-tooltip
    :text="text"
    :location="location"
    :activator="activator"
    :disabled="disabled"
    :eager="false"
    max-width="240"
    :content-class="`d2e-tooltip d2e-tooltip--${location}`"
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
  filter: drop-shadow(0 0 10px rgb(0 0 0 / 22%));
  font-family: var(--d2e-font-family);
  font-size: var(--d2e-font-caption1-size);
  font-weight: var(--d2e-font-caption1-weight);
  line-height: var(--d2e-font-caption1-line-height);
  overflow-wrap: anywhere;
  opacity: 1;

  &::after {
    content: "";
    position: absolute;
    border: 6px solid transparent;
  }

  &.d2e-tooltip--top::after {
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-bottom-width: 0;
    border-top-color: var(--d2e-color-white);
  }

  &.d2e-tooltip--bottom::after {
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-top-width: 0;
    border-bottom-color: var(--d2e-color-white);
  }

  &.d2e-tooltip--start::after {
    top: 50%;
    left: 100%;
    transform: translateY(-50%);
    border-right-width: 0;
    border-left-color: var(--d2e-color-white);
  }

  &.d2e-tooltip--end::after {
    top: 50%;
    right: 100%;
    transform: translateY(-50%);
    border-left-width: 0;
    border-right-color: var(--d2e-color-white);
  }
}
</style>
