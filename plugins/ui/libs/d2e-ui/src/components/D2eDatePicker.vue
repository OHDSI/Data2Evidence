<template>
  <v-defaults-provider :defaults="SCOPED_DEFAULTS">
    <v-menu
      v-model="isOpen"
      :close-on-content-click="false"
      location="bottom start"
      :offset="4"
      content-class="d2e-date-picker__menu"
    >
      <template #activator="{ props: activatorProps }">
        <v-text-field
          class="d2e-date-picker"
          :class="`d2e-date-picker--${size}`"
          :style="{ '--d2e-date-picker-height': `${sizeSpec.height}px` }"
          variant="outlined"
          density="compact"
          hide-details="auto"
          :model-value="text"
          :label="label"
          :placeholder="placeholder ?? format"
          :disabled="disabled"
          :clearable="clearable"
          :error-messages="shownErrors"
          :prepend-inner-icon="
            iconPosition === 'prepend' ? CALENDAR_ICON : undefined
          "
          :append-inner-icon="
            iconPosition === 'append' ? CALENDAR_ICON : undefined
          "
          v-bind="mergeProps(activatorProps, attrs)"
          @update:model-value="onType"
          @blur="commitText"
          @keydown.enter.prevent.stop="commitText"
          @click:clear="onClear"
        />
      </template>

      <v-defaults-provider :defaults="SCOPED_DEFAULTS">
        <v-date-picker
          ref="calendar"
          class="d2e-date-picker__calendar"
          hide-header
          show-adjacent-months
          rounded
          elevation="8"
          weekday-format="narrow"
          mode-icon="mdi-menu-down"
          :first-day-of-week="0"
          :model-value="modelValue"
          :min="min ?? undefined"
          :max="max ?? undefined"
          @update:model-value="onPick"
          @update:view-mode="onViewMode"
        />
      </v-defaults-provider>
    </v-menu>
  </v-defaults-provider>
</template>

<script setup lang="ts">
import {
  VDatePicker,
  VDefaultsProvider,
  VMenu,
  VTextField,
} from "vuetify/components";
import { computed, mergeProps, nextTick, ref, useAttrs, watch } from "vue";
import { formatDate, hasTime, parseDate, withTimeOf } from "./datePickerFormat";
import { DATE_PICKER_SIZE_MAP } from "./datePickerSizes";
import type {
  D2eDatePickerIconPosition,
  D2eDatePickerSize,
} from "./datePickerSizes";

defineOptions({ inheritAttrs: false });

const SCOPED_DEFAULTS = {
  VBtn: { color: undefined, rounded: undefined, elevation: undefined },
  VTextField: { style: undefined },
};

const YEAR_ROW_HEIGHT = 48;
const YEAR_COLUMNS = 3;
const SELECTED_YEAR_ROW = 2;

const CALENDAR_ICON =
  "svg:M20 3H19V1H17V3H7V1H5V3H4C2.9 3 2 3.9 2 5V21C2 22.1 2.9 23 4 23H20C21.1 23 22 22.1 22 21V5C22 3.9 21.1 3 20 3ZM20 21H4V10H20V21ZM20 8H4V5H20V8Z";

interface Props {
  modelValue?: Date | null;
  label?: string;
  placeholder?: string;
  format?: string;
  size?: D2eDatePickerSize;
  iconPosition?: D2eDatePickerIconPosition;
  disabled?: boolean;
  clearable?: boolean;
  min?: Date | null;
  max?: Date | null;
  errorMessages?: string | string[];
  invalidDateText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  label: undefined,
  placeholder: undefined,
  format: "YYYY-MM-DD",
  size: "md",
  iconPosition: "append",
  disabled: false,
  clearable: false,
  min: null,
  max: null,
  errorMessages: undefined,
  invalidDateText: "Invalid date",
});

const emit = defineEmits<{
  "update:modelValue": [value: Date | null];
}>();

const attrs = useAttrs();
const calendar = ref<InstanceType<typeof VDatePicker> | null>(null);
const sizeSpec = computed(() => DATE_PICKER_SIZE_MAP[props.size]);

const text = ref("");
const isInvalid = ref(false);
const internalOpen = ref(false);

const isOpen = computed({
  get: () => internalOpen.value,
  set: (value: boolean) => {
    internalOpen.value = props.disabled ? false : value;
  },
});

const shownErrors = computed(() =>
  isInvalid.value ? [props.invalidDateText] : props.errorMessages
);

watch(
  () => [props.modelValue, props.format] as const,
  ([value, format]) => {
    text.value = formatDate(value, format);
    isInvalid.value = false;
  },
  { immediate: true }
);

const sameInstant = (a: Date | null, b: Date | null) =>
  (a?.getTime() ?? null) === (b?.getTime() ?? null);

function emitIfChanged(value: Date | null) {
  if (!sameInstant(value, props.modelValue)) {
    emit("update:modelValue", value);
  }
}

function onType(value: string | null) {
  text.value = value ?? "";
  isInvalid.value = false;
}

function commitText() {
  if (!text.value.trim()) {
    emitIfChanged(null);
    return;
  }
  const parsed = parseDate(text.value, props.format);
  if (!parsed) {
    isInvalid.value = true;
    return;
  }
  text.value = formatDate(parsed, props.format);
  emitIfChanged(parsed);
}

function onPick(value: unknown) {
  if (!(value instanceof Date)) return;
  const picked = hasTime(props.format)
    ? withTimeOf(value, props.modelValue)
    : withTimeOf(value, null);
  text.value = formatDate(picked, props.format);
  isInvalid.value = false;
  internalOpen.value = false;
  emitIfChanged(picked);
}

function alignSelectedYear(list: HTMLElement) {
  const selected = list.querySelector<HTMLElement>(
    ".v-date-picker-years__content > .v-btn--active"
  );
  if (!selected?.parentElement) return;
  const index = Array.from(selected.parentElement.children).indexOf(selected);
  const row = Math.floor(index / YEAR_COLUMNS);
  list.scrollTop = Math.max(0, row - SELECTED_YEAR_ROW) * YEAR_ROW_HEIGHT;
}

async function onViewMode(mode: string) {
  if (mode !== "year") return;
  await nextTick();
  const list = (
    calendar.value?.$el as HTMLElement | undefined
  )?.querySelector<HTMLElement>(".v-date-picker-years");
  if (!list) return;
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    alignSelectedYear(list);
    observer.disconnect();
  });
  observer.observe(list);
}

function onClear(event: Event) {
  event.stopPropagation();
  text.value = "";
  isInvalid.value = false;
  internalOpen.value = false;
  emitIfChanged(null);
}
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

<style lang="scss">
.v-menu > .d2e-date-picker__menu > .d2e-date-picker__calendar.v-picker {
  --d2e-date-picker-text: rgba(0, 0, 0, 0.87);

  background: var(--d2e-color-white);
  color: var(--d2e-date-picker-text);
  font-family: var(--d2e-font-family);
  padding: var(--d2e-spacing-xxs) 0 var(--d2e-spacing-xs-s);

  &.v-date-picker--months,
  &.v-date-picker--year {
    padding-bottom: 0;
  }

  .v-date-picker-controls {
    height: 48px;
    padding: 0 var(--d2e-spacing-xs-s);

    .v-btn {
      color: var(--d2e-color-primary);
    }

    .v-date-picker-controls__only-month-btn,
    .v-date-picker-controls__only-year-btn {
      height: 36px;
      min-width: 0;
      padding: 0 var(--d2e-spacing-xxs) 0 var(--d2e-spacing-xs);
      border-radius: var(--d2e-radius-sm);
      color: var(--d2e-date-picker-text);
      font-size: var(--d2e-font-body1-size);
      font-weight: var(--d2e-font-body1-weight);
      letter-spacing: normal;

      > .v-btn__content {
        line-height: 24px;
      }

      > .v-btn__append {
        margin-inline: 2px 0;

        > .v-icon {
          color: var(--d2e-color-primary);
          width: 24px;
          height: 24px;
          font-size: 24px;
        }
      }
    }
  }

  .v-date-picker-month {
    padding: 0 var(--d2e-spacing-xs-s);
  }

  .v-date-picker-month__days {
    grid-template-columns: repeat(var(--v-date-picker-days-in-week), 1fr);
    column-gap: 0;
  }

  .v-date-picker-month__day {
    width: 100%;
    height: 44px;
    font-size: var(--d2e-font-body2-size);
    color: var(--d2e-date-picker-text);
  }

  .v-date-picker-month__day-btn {
    width: 36px;
    height: 36px;
    color: var(--d2e-date-picker-text);
    font-size: var(--d2e-font-body2-size);
    font-weight: var(--d2e-font-body2-weight);
    letter-spacing: normal;
  }

  .v-date-picker-month__day--adjacent {
    opacity: 1;

    .v-date-picker-month__day-btn {
      color: rgba(0, 0, 0, 0.44);
    }
  }

  .v-date-picker-month__day--selected .v-date-picker-month__day-btn {
    background-color: var(--d2e-color-primary);
    color: var(--d2e-color-white);
    font-weight: 500;
  }

  .v-date-picker-month__day-btn.v-btn--disabled {
    color: rgba(0, 0, 0, 0.38);
    opacity: 1;
  }

  .v-date-picker-months,
  .v-date-picker-years {
    margin-top: var(--d2e-spacing-xxs);
  }

  .v-date-picker-months__content,
  .v-date-picker-years__content {
    gap: 0;
    grid-auto-rows: 48px;
    align-items: center;
    padding-inline: var(--d2e-spacing-m);

    .v-btn {
      justify-self: center;
      width: calc(100% - 2 * var(--d2e-spacing-xs-s));
      min-width: 0;
      height: 36px;
      border-radius: 18px;
      color: var(--d2e-date-picker-text);
      font-size: var(--d2e-font-body2-size);
      font-weight: 500;
      text-transform: none;
      letter-spacing: normal;
    }

    .v-btn--variant-flat {
      background-color: rgba(0, 0, 0, 0.12);

      > .v-btn__overlay {
        opacity: 0;
      }
    }

    .v-btn--disabled {
      color: rgba(0, 0, 0, 0.38);
    }
  }
}
</style>
