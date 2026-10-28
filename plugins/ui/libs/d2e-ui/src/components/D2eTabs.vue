<template>
  <v-tabs
    class="d2e-tabs"
    :model-value="modelValue"
    grow
    hide-slider
    :height="TABS_STYLE_MAP.height"
    :aria-label="ariaLabel"
    v-bind="$attrs"
    @update:model-value="onUpdate"
  >
    <v-tab
      v-for="item in items"
      :key="item.value"
      class="d2e-tabs__tab"
      :value="item.value"
      :disabled="item.disabled"
      :ripple="false"
      :data-testid="`d2e-tab-${item.value}`"
    >
      <span class="d2e-tabs__content">
        <v-icon
          v-if="item.icon"
          :icon="item.icon"
          :size="TABS_STYLE_MAP.iconSize"
        />
        <span>{{ item.label }}</span>
      </span>
    </v-tab>
  </v-tabs>
</template>

<script setup lang="ts">
import { VIcon, VTab, VTabs } from "vuetify/components";
import { TABS_STYLE_MAP, type D2eTabItem } from "./tabsStyles";

interface Props {
  modelValue: string;
  items: D2eTabItem[];
  /** Accessible name of the tab list. */
  ariaLabel?: string;
}

withDefaults(defineProps<Props>(), {
  ariaLabel: undefined,
});

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

defineOptions({ inheritAttrs: false });

// VTabs can emit `unknown` (a tab with no value); every D2eTabItem has one.
function onUpdate(value: unknown) {
  if (typeof value === "string") emit("update:modelValue", value);
}
</script>

<style scoped lang="scss">
// Figma 1801:210538. The selected state is styled from tokens rather than with
// the Vuetify slider, so the rule width and colours stay design values.
.d2e-tabs {
  border-bottom: 1px solid var(--d2e-color-neutral-lighter);
  font-family: var(--d2e-font-family);

  &__tab {
    padding: 10px 24px;
    border-bottom: 3px solid transparent;
    border-radius: 0;
    color: var(--d2e-color-neutral);
    font-size: var(--d2e-font-body2-size);
    font-weight: var(--d2e-font-body2-weight);
    line-height: var(--d2e-font-body2-line-height);
    letter-spacing: 0;
    text-transform: none;

    &.v-tab--selected {
      border-bottom-color: var(--d2e-color-primary);
      color: var(--d2e-color-primary);
      font-weight: var(--d2e-font-subtitle2-weight);
    }

    // Vuetify paints a hover and focus overlay; the design has none.
    :deep(.v-btn__overlay) {
      opacity: 0;
    }
  }

  &__content {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
}
</style>
