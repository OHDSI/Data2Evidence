<template>
  <div class="d2e-pagination" :data-testid="testIdPrefix">
    <div class="d2e-pagination__size-group">
      <span :id="sizeLabelId" class="d2e-pagination__label">
        {{ itemsPerPageLabel }}
      </span>
      <div class="d2e-pagination__size">
        <select
          class="d2e-pagination__size-input"
          :value="itemsPerPage"
          :aria-labelledby="sizeLabelId"
          :data-testid="`${testIdPrefix}-size`"
          @change="onSizeChange"
        >
          <option v-for="size in itemsPerPageOptions" :key="size" :value="size">
            {{ size }}
          </option>
        </select>
        <v-icon
          icon="mdi-menu-down"
          :size="PAGINATION_STYLE_MAP.iconSize"
          class="d2e-pagination__size-arrow"
        />
      </div>
    </div>

    <span class="d2e-pagination__range">{{ rangeText }}</span>

    <div class="d2e-pagination__nav">
      <D2eIconButton
        v-for="button in buttons"
        :key="button.name"
        category="no-stroke"
        size="sm"
        :icon="button.icon"
        :disabled="button.disabled"
        :ariaLabel="pageLabels[button.name]"
        :data-testid="`${testIdPrefix}-${button.name}`"
        @click="goTo(button.target)"
      >
        <svg
          :width="PAGINATION_STYLE_MAP.iconSize"
          :height="PAGINATION_STYLE_MAP.iconSize"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path :d="PAGINATION_ICON_PATHS[button.name]" fill="currentColor" />
        </svg>
      </D2eIconButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from "vue";
import { VIcon } from "vuetify/components";
import D2eIconButton from "./D2eIconButton.vue";
import {
  PAGINATION_ICON_PATHS,
  PAGINATION_STYLE_MAP,
  pagerState,
  pageTarget,
  type D2ePaginationButton,
  type D2ePaginationPageLabels,
} from "./pagination";

const props = withDefaults(
  defineProps<{
    page: number;
    itemsPerPage: number;
    total: number;
    itemsPerPageOptions: readonly number[];
    itemsPerPageLabel: string;
    rangeText: string;
    pageLabels?: D2ePaginationPageLabels;
    testIdPrefix?: string;
  }>(),
  {
    pageLabels: () => ({
      first: "First page",
      previous: "Previous page",
      next: "Next page",
      last: "Last page",
    }),
    testIdPrefix: "d2e-pagination",
  },
);

const emit = defineEmits<{
  "update:page": [value: number];
  "update:itemsPerPage": [value: number];
}>();

const sizeLabelId = `d2e-pagination-size-${useId()}`;

const state = computed(() =>
  pagerState(props.page, props.itemsPerPage, props.total),
);

const buttons = computed<
  {
    name: D2ePaginationButton;
    icon: string;
    target: number;
    disabled: boolean;
  }[]
>(() => [
  {
    name: "first",
    icon: "mdi-page-first",
    target: 1,
    disabled: !state.value.canGoBack,
  },
  {
    name: "previous",
    icon: "mdi-chevron-left",
    target: props.page - 1,
    disabled: !state.value.canGoBack,
  },
  {
    name: "next",
    icon: "mdi-chevron-right",
    target: props.page + 1,
    disabled: !state.value.canGoForward,
  },
  {
    name: "last",
    icon: "mdi-page-last",
    target: state.value.lastPage,
    disabled: !state.value.canGoForward,
  },
]);

function goTo(target: number): void {
  const next = pageTarget(target, props.page, state.value.lastPage);
  if (next !== null) emit("update:page", next);
}

function onSizeChange(event: Event): void {
  const size = Number((event.target as HTMLSelectElement).value);
  if (!Number.isFinite(size) || size <= 0) return;
  emit("update:itemsPerPage", size);
  emit("update:page", 1);
}
</script>

<style scoped lang="scss">
.d2e-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-family: var(--d2e-font-family);

  &__size-group {
    display: flex;
    align-items: center;
    gap: var(--d2e-spacing-xs);
  }

  &__nav {
    display: flex;
    align-items: center;
    gap: var(--d2e-spacing-xs-s);
    padding-inline: var(--d2e-spacing-xxs);

    :deep(.d2e-icon-button) {
      --d2e-icon-button-color: var(--d2e-color-neutral);
    }

    :deep(.d2e-icon-button:disabled) {
      --d2e-icon-button-color: var(--d2e-color-neutral);
      opacity: v-bind("PAGINATION_STYLE_MAP.disabledOpacity");
    }
  }

  &__label,
  &__range {
    font-size: var(--d2e-font-body2-size);
    font-weight: var(--d2e-font-body2-weight);
    line-height: 1.425;
    color: var(--d2e-color-neutral-black);
    white-space: nowrap;
  }

  &__range {
    min-width: v-bind("`${PAGINATION_STYLE_MAP.rangeMinWidth}px`");
    padding-inline: var(--d2e-spacing-s);
    text-align: right;
  }

  &__size {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  &__size-input {
    appearance: none;
    width: v-bind("`${PAGINATION_STYLE_MAP.sizeSelectWidth}px`");
    height: v-bind("`${PAGINATION_STYLE_MAP.sizeSelectHeight}px`");
    padding: 0 40px 0 var(--d2e-spacing-s);
    border: var(--d2e-border-width-sm) solid rgba(0, 0, 0, 0.38);
    border-radius: var(--d2e-radius-sm);
    font-family: inherit;
    font-size: var(--d2e-font-body1-size);
    line-height: 1.5;
    color: var(--d2e-color-neutral-black);
    background: var(--d2e-color-white);
    cursor: pointer;
  }

  &__size-arrow {
    position: absolute;
    right: var(--d2e-spacing-xs-s);
    pointer-events: none;
    color: rgba(0, 0, 0, 0.54);
  }
}
</style>
