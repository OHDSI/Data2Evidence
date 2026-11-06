<template>
  <v-text-field
    class="d2e-date-picker"
    :class="`d2e-date-picker--${size}`"
    :style="{ '--d2e-date-picker-height': `${sizeSpec.height}px` }"
    variant="outlined"
    density="compact"
    hide-details="auto"
    :model-value="text"
    :label="label"
    :placeholder="placeholder"
    :disabled="disabled"
    :clearable="clearable"
    :error-messages="errorMessages"
    :prepend-inner-icon="iconPosition === 'prepend' ? CALENDAR_ICON : undefined"
    :append-inner-icon="iconPosition === 'append' ? CALENDAR_ICON : undefined"
    @update:model-value="emit('type', $event)"
    @blur="emit('commit')"
    @keydown.enter.prevent.stop="emit('commit')"
    @click:clear="emit('clear', $event)"
  />
</template>

<script setup lang="ts">
import { VTextField } from "vuetify/components";
import { computed } from "vue";
import { DATE_PICKER_SIZE_MAP } from "./datePickerSizes";
import type {
  D2eDatePickerIconPosition,
  D2eDatePickerSize,
} from "./datePickerSizes";

const CALENDAR_ICON =
  "svg:M20 3H19V1H17V3H7V1H5V3H4C2.9 3 2 3.9 2 5V21C2 22.1 2.9 23 4 23H20C21.1 23 22 22.1 22 21V5C22 3.9 21.1 3 20 3ZM20 21H4V10H20V21ZM20 8H4V5H20V8Z";

interface Props {
  text: string;
  label?: string;
  placeholder?: string;
  size: D2eDatePickerSize;
  iconPosition: D2eDatePickerIconPosition;
  disabled: boolean;
  clearable: boolean;
  errorMessages?: string | string[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  type: [value: string | null];
  commit: [];
  clear: [event: Event];
}>();

const sizeSpec = computed(() => DATE_PICKER_SIZE_MAP[props.size]);
</script>

<style scoped lang="scss">
.d2e-date-picker {
  --d2e-date-picker-padding: var(--d2e-spacing-s);
  --d2e-date-picker-font-size: var(--d2e-font-body1-size);
  --d2e-date-picker-letter-spacing: 0.15px;
  --d2e-date-picker-icon-size: 24px;
  --d2e-date-picker-error-text: #d32f2f;

  font-family: var(--d2e-font-family);

  &.d2e-date-picker--sm {
    --d2e-date-picker-padding: var(--d2e-spacing-xs-s);
    --d2e-date-picker-font-size: var(--d2e-font-body2-size);
    --d2e-date-picker-letter-spacing: 0.13px;
    --d2e-date-picker-icon-size: 16px;

    :deep(.v-field__outline__start) {
      flex-basis: var(--d2e-spacing-xs);
    }
  }

  :deep(.v-field) {
    --v-field-padding-start: 0px;
    --v-field-padding-end: 0px;

    min-height: var(--d2e-date-picker-height);
    border-radius: var(--d2e-radius-sm);
    padding-inline: var(--d2e-date-picker-padding);
    color: rgba(0, 0, 0, 0.87);
  }

  :deep(.v-field__outline) {
    color: var(--d2e-color-neutral-black);
  }

  :deep(.v-field__input) {
    min-height: var(--d2e-date-picker-height);
    height: var(--d2e-date-picker-height);
    padding-block: 0;
    padding-inline: 0;
    font-size: var(--d2e-date-picker-font-size);
    font-weight: var(--d2e-font-body1-weight);
    letter-spacing: var(--d2e-date-picker-letter-spacing);
    color: rgba(0, 0, 0, 0.87);
  }

  :deep(.v-field__input::placeholder) {
    color: rgba(0, 0, 0, 0.38);
    font-style: normal;
    opacity: 1;
  }

  :deep(.v-label.v-field-label) {
    font-size: var(--d2e-date-picker-font-size);
    color: rgba(0, 0, 0, 0.62);
    opacity: 1;
  }

  :deep(.v-label.v-field-label--floating) {
    font-size: var(--d2e-font-caption1-size);
  }

  :deep(.v-field--focused .v-label.v-field-label) {
    color: var(--d2e-color-primary);
  }

  :deep(.v-field--focused .v-field__outline) {
    color: var(--d2e-color-primary);
  }

  :deep(.v-field__prepend-inner),
  :deep(.v-field__append-inner) {
    align-items: center;
    padding-top: 0;
  }

  :deep(.v-field__prepend-inner .v-icon),
  :deep(.v-field__append-inner .v-icon) {
    width: var(--d2e-date-picker-icon-size);
    height: var(--d2e-date-picker-icon-size);
    font-size: var(--d2e-date-picker-icon-size);
    color: rgba(0, 0, 0, 0.54);
    opacity: 1;
  }

  :deep(.v-field__prepend-inner .v-icon) {
    margin-inline-end: var(--d2e-spacing-xs);
  }

  &.v-input--error {
    :deep(.v-field__outline),
    :deep(.v-label.v-field-label) {
      color: var(--d2e-color-alarm);
    }

    :deep(.v-messages) {
      color: var(--d2e-date-picker-error-text);
      opacity: 1;
    }
  }

  :deep(.v-input__details) {
    min-height: 0;
    padding-top: 6px;
    padding-inline: var(--d2e-date-picker-padding);
  }

  :deep(.v-messages__message) {
    font-size: var(--d2e-font-caption1-size);
    line-height: 1.66;
    letter-spacing: 0.4px;
  }
}
</style>
