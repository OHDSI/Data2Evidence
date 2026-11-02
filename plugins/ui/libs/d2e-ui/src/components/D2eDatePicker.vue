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
          @commit="commitText"
          @clear="onClear"
        />
      </template>

      <v-defaults-provider :defaults="SCOPED_DEFAULTS">
        <D2eDatePickerCalendar
          :model-value="modelValue"
          :min="min"
          :max="max"
          @update:model-value="onPick"
        />
      </v-defaults-provider>
    </v-menu>
  </v-defaults-provider>
</template>

<script setup lang="ts">
import { VDefaultsProvider, VMenu } from "vuetify/components";
import { computed, mergeProps, ref, useAttrs } from "vue";
import D2eDatePickerCalendar from "./D2eDatePickerCalendar.vue";
import D2eDatePickerField from "./D2eDatePickerField.vue";
import { hasTime, withTimeOf } from "./datePickerFormat";
import type {
  D2eDatePickerIconPosition,
  D2eDatePickerSize,
} from "./datePickerSizes";
import { useDatePickerText } from "./useDatePickerText";

defineOptions({ inheritAttrs: false });

const SCOPED_DEFAULTS = {
  VBtn: { color: undefined, rounded: undefined, elevation: undefined },
  VTextField: { style: undefined },
};

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
  menuZIndex?: number | string;
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
  menuZIndex: undefined,
});

const emit = defineEmits<{
  "update:modelValue": [value: Date | null];
}>();

const attrs = useAttrs();
const internalOpen = ref(false);

const isOpen = computed({
  get: () => internalOpen.value,
  set: (value: boolean) => {
    internalOpen.value = props.disabled ? false : value;
  },
});

const { text, shownErrors, show, onType, commitText, emitIfChanged } =
  useDatePickerText(props, (value) => emit("update:modelValue", value));

function onPick(value: Date) {
  const picked = hasTime(props.format)
    ? withTimeOf(value, props.modelValue)
    : withTimeOf(value, null);
  show(picked);
  internalOpen.value = false;
  emitIfChanged(picked);
}

function onClear(event: Event) {
  event.stopPropagation();
  show(null);
  internalOpen.value = false;
  emitIfChanged(null);
}
</script>
