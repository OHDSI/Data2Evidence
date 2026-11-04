<template>
  <div
    class="d2e-split-button"
    :class="{ 'd2e-split-button--disabled': disabled }"
    v-bind="$attrs"
  >
    <v-btn
      class="d2e-split-button__main"
      variant="text"
      :ripple="false"
      :disabled="disabled"
      data-testid="d2e-split-button-main"
      @click="emit('click')"
    >
      <v-icon
        v-if="icon"
        :icon="icon"
        :size="SPLIT_BUTTON_STYLE_MAP.iconSize"
      />
      <span>{{ label }}</span>
    </v-btn>
    <span class="d2e-split-button__separator" aria-hidden="true" />
    <D2eMenu
      :items="items"
      :width="SPLIT_BUTTON_STYLE_MAP.menuWidth"
      location="bottom end"
      @select="emit('select', $event)"
    >
      <template #activator="activatorProps">
        <v-btn
          v-bind="activatorProps"
          class="d2e-split-button__chevron"
          variant="text"
          :ripple="false"
          :disabled="disabled"
          :aria-label="menuLabel"
          data-testid="d2e-split-button-menu"
        >
          <v-icon
            icon="mdi-chevron-down"
            :size="SPLIT_BUTTON_STYLE_MAP.iconSize"
          />
        </v-btn>
      </template>
    </D2eMenu>
  </div>
</template>

<script setup lang="ts">
import { VBtn, VIcon } from "vuetify/components";
import D2eMenu, { type D2eMenuItem } from "./D2eMenu.vue";
import { SPLIT_BUTTON_STYLE_MAP } from "./splitButton";

interface Props {
  label: string;
  /** An MDI glyph shown before the label. */
  icon?: string;
  /** The chevron's menu. */
  items: D2eMenuItem[];
  disabled?: boolean;
  /** Accessible name of the chevron. */
  menuLabel?: string;
}

withDefaults(defineProps<Props>(), {
  icon: undefined,
  disabled: false,
  menuLabel: "More options",
});

const emit = defineEmits<{ click: []; select: [value: string] }>();

defineOptions({ inheritAttrs: false });
</script>

<style scoped lang="scss">
// Figma 2855:278235.
.d2e-split-button {
  display: inline-flex;
  align-items: stretch;
  height: 40px;
  overflow: hidden;
  border: 1px solid var(--d2e-color-primary-lighter);
  border-radius: 8px;
  font-family: var(--d2e-font-family);

  :deep(.v-btn) {
    height: 100%;
    min-width: 0;
    border-radius: 0;
    color: var(--d2e-color-primary);
    font-size: var(--d2e-font-button-size);
    font-weight: var(--d2e-font-button-weight);
    line-height: var(--d2e-font-button-line-height);
    letter-spacing: 0;
    text-transform: none;
  }

  :deep(.v-btn:hover > .v-btn__overlay) {
    opacity: 0;
  }

  :deep(.v-btn:hover) {
    background: var(--d2e-color-primary-xtra-lightest);
  }

  &__main {
    padding: 0 16px;

    :deep(.v-btn__content) {
      gap: 8px;
    }
  }

  &__separator {
    width: 1px;
    background: var(--d2e-color-primary-lighter);
  }

  &__chevron {
    width: 40px;
    padding: 0;
  }

  &--disabled {
    border-color: var(--d2e-color-neutral-lighter);

    .d2e-split-button__separator {
      background: var(--d2e-color-neutral-lighter);
    }

    :deep(.v-btn) {
      color: var(--d2e-color-neutral-light);
    }
  }
}
</style>
