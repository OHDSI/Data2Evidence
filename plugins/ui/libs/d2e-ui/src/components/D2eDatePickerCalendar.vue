<template>
  <v-date-picker
    ref="calendar"
    class="d2e-date-picker__calendar"
    hide-header
    show-adjacent-months
    :rounded="!flat"
    :elevation="flat ? 0 : 8"
    weekday-format="narrow"
    mode-icon="mdi-menu-down"
    :first-day-of-week="0"
    :model-value="modelValue"
    :min="min ?? undefined"
    :max="max ?? undefined"
    @update:model-value="onPick"
    @update:view-mode="onViewMode"
  />
</template>

<script setup lang="ts">
import { VDatePicker } from "vuetify/components";
import { nextTick, ref } from "vue";

const YEAR_ROW_HEIGHT = 48;
const YEAR_COLUMNS = 3;
const SELECTED_YEAR_ROW = 2;

interface Props {
  modelValue: Date | null;
  min: Date | null;
  max: Date | null;
  flat?: boolean;
}

withDefaults(defineProps<Props>(), { flat: false });

const emit = defineEmits<{
  "update:modelValue": [value: Date];
}>();

const calendar = ref<InstanceType<typeof VDatePicker> | null>(null);

function onPick(value: unknown) {
  if (value instanceof Date) emit("update:modelValue", value);
}

function alignSelectedYear(list: HTMLElement) {
  const selected = list.querySelector<HTMLElement>(
    ".v-date-picker-years__content > .v-btn--active",
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
</script>

<style lang="scss">
.v-menu > .d2e-date-picker__menu .d2e-date-picker__calendar.v-picker {
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
