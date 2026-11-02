<template>
  <v-defaults-provider :defaults="SCOPED_DEFAULTS">
    <v-menu
      v-model="isOpen"
      :close-on-content-click="false"
      location="bottom start"
      :offset="4"
      :z-index="menuZIndex"
      content-class="d2e-date-picker__menu"
    >
      <template #activator="{ props: activatorProps }">
        <D2eDatePickerField
          :text="text"
          :label="label"
          :placeholder="placeholder ?? format"
          :size="size"
          :icon-position="iconPosition"
          :disabled="disabled"
          :clearable="clearable"
          :error-messages="shownErrors"
          v-bind="mergeProps(activatorProps, attrs)"
          @type="onType"
          @commit="onCommitText"
          @clear="onClear"
        />
      </template>

      <v-defaults-provider :defaults="SCOPED_DEFAULTS">
        <div class="d2e-date-time-picker__panel">
          <div class="d2e-date-time-picker__body">
            <D2eDatePickerCalendar
              flat
              :model-value="draft"
              :min="min"
              :max="max"
              @update:model-value="onPickDay"
            />
            <D2eTimeColumn
              :options="HOUR_OPTIONS"
              :selected="selectedHour(draft)"
              :open="isOpen"
              :label="hoursLabel"
              @select="onPickHour"
            />
            <D2eTimeColumn
              :options="minutes"
              :selected="selectedMinute(draft, minutes)"
              :open="isOpen"
              :label="minutesLabel"
              @select="onPickMinute"
            />
          </div>
          <div class="d2e-date-time-picker__actions">
            <D2eButton variant="ghost" @click="close('cancel')">
              {{ cancelText }}
            </D2eButton>
            <D2eButton variant="ghost" @click="close('accept')">
              {{ okText }}
            </D2eButton>
          </div>
        </div>
      </v-defaults-provider>
    </v-menu>
  </v-defaults-provider>
</template>

<script setup lang="ts">
import { VDefaultsProvider, VMenu } from "vuetify/components";
import { computed, mergeProps, ref, useAttrs, watch } from "vue";
import D2eButton from "./D2eButton.vue";
import D2eDatePickerCalendar from "./D2eDatePickerCalendar.vue";
import D2eDatePickerField from "./D2eDatePickerField.vue";
import D2eTimeColumn from "./D2eTimeColumn.vue";
import { isWithinDays } from "./datePickerFormat";
import type {
  D2eDatePickerIconPosition,
  D2eDatePickerSize,
} from "./datePickerSizes";
import {
  DEFAULT_MINUTE_STEP,
  HOUR_OPTIONS,
  minuteOptions,
  selectedHour,
  selectedMinute,
  withDay,
  withHour,
  withMinute,
} from "./timePicker";
import { sameInstant, useDatePickerText } from "./useDatePickerText";

defineOptions({ inheritAttrs: false });

const SCOPED_DEFAULTS = {
  VBtn: { color: undefined, rounded: undefined, elevation: undefined },
  VTextField: { style: undefined },
};

type CloseAction = "accept" | "cancel";

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
  minuteStep?: number;
  errorMessages?: string | string[];
  invalidDateText?: string;
  cancelText?: string;
  okText?: string;
  hoursLabel?: string;
  minutesLabel?: string;
  menuZIndex?: number | string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  label: undefined,
  placeholder: undefined,
  format: "YYYY-MM-DD HH:mm",
  size: "md",
  iconPosition: "append",
  disabled: false,
  clearable: false,
  min: null,
  max: null,
  minuteStep: DEFAULT_MINUTE_STEP,
  errorMessages: undefined,
  invalidDateText: "Invalid date",
  cancelText: "Cancel",
  okText: "OK",
  hoursLabel: "Hours",
  minutesLabel: "Minutes",
  menuZIndex: undefined,
});

const emit = defineEmits<{
  "update:modelValue": [value: Date | null];
}>();

const attrs = useAttrs();
const internalOpen = ref(false);
const draft = ref<Date | null>(null);
const closeAction = ref<CloseAction>("accept");

const minutes = computed(() => minuteOptions(props.minuteStep));

const isOpen = computed({
  get: () => internalOpen.value,
  set: (value: boolean) => {
    internalOpen.value = props.disabled ? false : value;
  },
});

const {
  text,
  shownErrors,
  show,
  markInvalid,
  onType,
  commitText,
  emitIfChanged,
} = useDatePickerText(props, (value) => emit("update:modelValue", value));

watch(internalOpen, (open) => {
  if (open) {
    closeAction.value = "accept";
    draft.value = props.modelValue;
    return;
  }
  if (closeAction.value === "accept") {
    acceptDraft();
  } else {
    show(props.modelValue);
  }
});

function acceptDraft() {
  const value = draft.value;
  if (!value || sameInstant(value, props.modelValue)) {
    show(props.modelValue);
    return;
  }
  if (!isWithinDays(value, props.min, props.max)) {
    markInvalid();
    return;
  }
  show(value);
  emitIfChanged(value);
}

function setDraft(value: Date) {
  draft.value = value;
  show(value);
}

function onPickDay(day: Date) {
  setDraft(withDay(day, draft.value));
}

function onPickHour(hour: number) {
  setDraft(withHour(draft.value, hour, new Date()));
}

function onPickMinute(minute: number) {
  setDraft(withMinute(draft.value, minute, new Date()));
}

function onCommitText() {
  const committed = commitText();
  if (committed !== undefined && internalOpen.value) {
    draft.value = committed;
  }
}

function close(action: CloseAction) {
  closeAction.value = action;
  internalOpen.value = false;
}

function onClear(event: Event) {
  event.stopPropagation();
  closeAction.value = "cancel";
  internalOpen.value = false;
  show(null);
  emitIfChanged(null);
}
</script>

<style lang="scss">
.v-menu > .d2e-date-picker__menu > .d2e-date-time-picker__panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--d2e-radius-sm);
  background: var(--d2e-color-white);
  box-shadow: var(--d2e-elevation-e8);

  > .d2e-date-time-picker__body {
    display: flex;
    align-items: stretch;
  }

  > .d2e-date-time-picker__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--d2e-spacing-xs);
    padding: var(--d2e-spacing-xs);
    border-top: 1px solid rgba(0, 0, 0, 0.12);
    font-family: var(--d2e-font-family);

    > .v-btn {
      font-family: inherit;
    }
  }
}
</style>
