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
      <v-icon :icon="option.icon" size="20" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { VIcon } from "vuetify/components";

export interface D2eViewToggleOption {
  value: string;
  label: string;
  icon: string;
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
  height: 48px;
  box-sizing: border-box;
  overflow: hidden;
  border: var(--d2e-border-width-sm) solid rgba(0, 0, 0, 0.12);
  border-radius: var(--d2e-radius-sm);
  background: var(--d2e-color-white);

  &__option {
    display: grid;
    place-items: center;
    width: 50px;
    padding: 0;
    border: 0;
    background: transparent;
    color: rgba(0, 0, 0, 0.6);
    cursor: pointer;

    & + & {
      border-left: var(--d2e-border-width-sm) solid rgba(0, 0, 0, 0.12);
    }

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
      background: rgba(0, 0, 0, 0.12);
      color: rgba(0, 0, 0, 0.87);

      &:hover {
        background: rgba(0, 0, 0, 0.16);
      }
    }
  }
}
</style>
