import { computed, ref, watch } from "vue";
import { formatDate, isWithinDays, parseDate } from "./datePickerFormat";

interface DatePickerTextProps {
  modelValue: Date | null;
  format: string;
  min: Date | null;
  max: Date | null;
  errorMessages?: string | string[];
  invalidDateText: string;
}

export const sameInstant = (a: Date | null, b: Date | null) =>
  (a?.getTime() ?? null) === (b?.getTime() ?? null);

export function useDatePickerText(
  props: DatePickerTextProps,
  emitValue: (value: Date | null) => void,
) {
  const text = ref("");
  const isInvalid = ref(false);
  const isEdited = ref(false);

  const shownErrors = computed(() =>
    isInvalid.value ? [props.invalidDateText] : props.errorMessages,
  );

  function show(value: Date | null) {
    text.value = formatDate(value, props.format);
    isInvalid.value = false;
    isEdited.value = false;
  }

  function markInvalid() {
    isInvalid.value = true;
    isEdited.value = true;
  }

  watch(
    () => [props.modelValue, props.format] as const,
    ([value]) => show(value),
    { immediate: true },
  );

  function emitIfChanged(value: Date | null) {
    if (!sameInstant(value, props.modelValue)) {
      emitValue(value);
    }
  }

  function onType(value: string | null) {
    text.value = value ?? "";
    isInvalid.value = false;
    isEdited.value = true;
  }

  function commitText(): Date | null | undefined {
    if (!isEdited.value) return undefined;
    if (text.value === formatDate(props.modelValue, props.format)) {
      isInvalid.value = false;
      return undefined;
    }
    if (!text.value.trim()) {
      emitIfChanged(null);
      return null;
    }
    const parsed = parseDate(text.value, props.format);
    if (!parsed || !isWithinDays(parsed, props.min, props.max)) {
      isInvalid.value = true;
      return undefined;
    }
    show(parsed);
    emitIfChanged(parsed);
    return parsed;
  }

  return {
    text,
    shownErrors,
    isEdited,
    show,
    markInvalid,
    onType,
    commitText,
    emitIfChanged,
  };
}
