<template>
  <div class="d2e-view-toggle" role="group" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="d2e-view-toggle__option"
      :class="{
        'd2e-view-toggle__option--selected': option.value === modelValue,
      }"
      :aria-label="option.label"
      :aria-pressed="option.value === modelValue"
      :data-testid="option.testId"
      @click="select(option.value)"
    >
      <v-icon
        :icon="option.icon"
        :size="option.iconSize ?? VIEW_TOGGLE_STYLE_MAP.defaultIconSize"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { VIcon } from "vuetify/components";
import { VIEW_TOGGLE_STYLE_MAP } from "./viewToggle";

export interface D2eViewToggleOption {
  value: string;
  label: string;
  icon: string;
  iconSize?: number;
  testId?: string;
}

interface Props {
  modelValue: string;
  options: D2eViewToggleOption[];
  label: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function select(value: string) {
  if (value !== props.modelValue) emit("update:modelValue", value);
}
</script>

<style scoped lang="scss">
.d2e-view-toggle {
  display: inline-flex;
  width: v-bind("`${VIEW_TOGGLE_STYLE_MAP.width}px`");
  height: v-bind("`${VIEW_TOGGLE_STYLE_MAP.height}px`");
  box-sizing: border-box;
  overflow: hidden;
  border: var(--d2e-border-width-sm) solid
    v-bind("VIEW_TOGGLE_STYLE_MAP.borderColor");
  border-radius: var(--d2e-radius-md);
  background: var(--d2e-color-white);

  &__option {
    display: grid;
    flex: 1 1 0;
    place-items: center;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--d2e-color-neutral-black);
    cursor: pointer;

    &:hover {
      background: rgba(0, 0, 0, 0.04);
    }

    &:focus {
      outline: none;
    }

    &:focus-visible {
      outline: 1px dotted rgb(0, 84, 131);
      outline-offset: -3px;
    }

    &--selected {
      background: v-bind("VIEW_TOGGLE_STYLE_MAP.selectedBackground");

      &:hover {
        background: v-bind("VIEW_TOGGLE_STYLE_MAP.selectedBackground");
      }
    }
  }
}
</style>
