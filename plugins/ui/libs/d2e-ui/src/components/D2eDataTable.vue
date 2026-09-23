<template>
  <div class="d2e-data-table" v-bind="$attrs">
    <!--
      A controlled table: rows arrive filtered and sorted, and a header click
      only emits the next sort. Vuetify's own sort is disabled, so the order on
      screen is always the caller's order - which is what an export of "the
      rows as shown" needs.
    -->
    <v-data-table
      :headers="vuetifyHeaders"
      :items="items"
      :item-value="itemValue"
      :page="page"
      :items-per-page="itemsPerPage"
      :expanded="expanded"
      :show-expand="expandable"
      disable-sort
      hide-default-footer
      @update:page="emit('update:page', $event)"
      @update:expanded="emit('update:expanded', $event as string[])"
    >
      <template
        v-for="header in headers"
        :key="header.key"
        #[`header.${header.key}`]
      >
        <button
          v-if="header.sortable"
          type="button"
          class="d2e-data-table__sort"
          :aria-label="`${header.title}, sort`"
          :data-testid="`d2e-data-table-sort-${header.key}`"
          @click="emit('update:sortBy', nextSort(sortBy, header.key))"
        >
          <span>{{ header.title }}</span>
          <v-icon :icon="sortIcon(header.key)" size="16" />
        </button>
        <span v-else>{{ header.title }}</span>
      </template>

      <template
        v-for="header in headers"
        :key="header.key"
        #[`item.${header.key}`]="slotProps"
      >
        <slot :name="`item.${header.key}`" v-bind="slotProps">{{
          slotProps.value
        }}</slot>
      </template>

      <template
        #[`item.data-table-expand`]="{ internalItem, isExpanded, toggleExpand }"
      >
        <D2eIconButton
          category="no-stroke"
          size="sm"
          :icon="
            isExpanded(internalItem) ? 'mdi-chevron-down' : 'mdi-chevron-right'
          "
          :ariaLabel="expandLabel"
          :aria-expanded="isExpanded(internalItem)"
          @click="toggleExpand(internalItem)"
        />
      </template>

      <template #expanded-row="{ columns, item }">
        <tr class="d2e-data-table__detail-row">
          <td :colspan="columns.length" class="d2e-data-table__detail-cell">
            <slot name="expanded-row" :item="item" />
          </td>
        </tr>
      </template>

      <template #no-data>
        <span class="d2e-data-table__empty">{{ noDataText }}</span>
      </template>

      <template #bottom>
        <div class="d2e-data-table__footer" data-testid="d2e-data-table-footer">
          <div class="d2e-data-table__size">
            <span>{{ rowsPerPageLabel }}</span>
            <D2eSelect
              class="d2e-data-table__size-select"
              size="sm"
              :model-value="String(itemsPerPage)"
              :items="sizeItems"
              @update:model-value="onSize"
            />
          </div>
          <div class="d2e-data-table__pager">
            <span class="d2e-data-table__range">{{ rangeText }}</span>
            <D2eIconButton
              size="sm"
              icon="mdi-page-first"
              :ariaLabel="labels.first"
              :disabled="page <= 1"
              @click="emit('update:page', 1)"
            />
            <D2eIconButton
              size="sm"
              icon="mdi-chevron-left"
              :ariaLabel="labels.previous"
              :disabled="page <= 1"
              @click="emit('update:page', page - 1)"
            />
            <D2eIconButton
              size="sm"
              icon="mdi-chevron-right"
              :ariaLabel="labels.next"
              :disabled="page >= lastPage"
              @click="emit('update:page', page + 1)"
            />
            <D2eIconButton
              size="sm"
              icon="mdi-page-last"
              :ariaLabel="labels.last"
              :disabled="page >= lastPage"
              @click="emit('update:page', lastPage)"
            />
          </div>
        </div>
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts" generic="T extends object">
import { computed } from "vue";
import { VDataTable, VIcon } from "vuetify/components";
import D2eIconButton from "./D2eIconButton.vue";
import D2eSelect from "./D2eSelect.vue";
import {
  DATA_TABLE_STYLE_MAP,
  nextSort,
  pageCount,
  pageRange,
  type D2eDataTableProps,
  type D2eSortItem,
} from "./dataTable";

const props = withDefaults(defineProps<D2eDataTableProps<T>>(), {
  sortBy: () => [],
  page: 1,
  itemsPerPage: DATA_TABLE_STYLE_MAP.defaultItemsPerPage,
  expandable: false,
  expanded: () => [],
  noDataText: "No data",
  rowsPerPageLabel: "Rows per page:",
  rangeLabel: (start: number, end: number, total: number) =>
    `${start}-${end} of ${total}`,
  pageLabels: () => ({
    first: "First page",
    previous: "Previous page",
    next: "Next page",
    last: "Last page",
  }),
  expandLabel: "Show details",
});

const emit = defineEmits<{
  "update:sortBy": [value: D2eSortItem[]];
  "update:page": [value: number];
  "update:itemsPerPage": [value: number];
  "update:expanded": [value: string[]];
}>();

defineOptions({ inheritAttrs: false });

const labels = computed(() => props.pageLabels);

// Vuetify must not sort: the caller owns the order (see the template comment).
// The expand column leads the row, as in Figma (2855:278876); Vuetify appends
// it last unless the headers already name it.
const vuetifyHeaders = computed(() => [
  ...(props.expandable
    ? [
        {
          key: "data-table-expand",
          title: "",
          sortable: false,
          width: DATA_TABLE_STYLE_MAP.expandColumnWidth,
        },
      ]
    : []),
  ...props.headers.map((header) => ({
    key: header.key,
    title: header.title,
    sortable: false,
    width: header.width,
  })),
]);

const sizeItems = DATA_TABLE_STYLE_MAP.itemsPerPageOptions.map((size) => ({
  label: String(size),
  value: String(size),
}));

const lastPage = computed(() =>
  pageCount(props.itemsPerPage, props.items.length),
);

const rangeText = computed(() => {
  const { start, end, total } = pageRange(
    props.page,
    props.itemsPerPage,
    props.items.length,
  );
  return props.rangeLabel(start, end, total);
});

function sortIcon(key: string): string {
  const active = props.sortBy.find((item) => item.key === key);
  return active
    ? DATA_TABLE_STYLE_MAP.sortIcons[active.order]
    : DATA_TABLE_STYLE_MAP.sortIcons.none;
}

function onSize(value: string | string[] | null) {
  const size = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isFinite(size) || size <= 0) return;
  emit("update:itemsPerPage", size);
  emit("update:page", 1);
}
</script>

<style scoped lang="scss">
// Figma 2855:278875 (header), 2855:278884 (row), 2855:278894 (pagination).
.d2e-data-table {
  font-family: var(--d2e-font-family);

  :deep(.v-table) {
    background: transparent;
    color: var(--d2e-color-neutral-black);
  }

  :deep(.v-table > .v-table__wrapper > table > thead > tr > th) {
    height: 52px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--d2e-color-neutral-lighter);
    font-size: var(--d2e-font-subtitle2-size);
    font-weight: var(--d2e-font-subtitle2-weight);
    line-height: var(--d2e-font-subtitle2-line-height);
    color: var(--d2e-color-neutral-black);
  }

  :deep(.v-table > .v-table__wrapper > table > tbody > tr > td) {
    height: 48px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--d2e-color-neutral-lighter);
    font-size: var(--d2e-font-body2-size);
    line-height: var(--d2e-font-body2-line-height);
  }

  // The expand column: 48px wide, a 32px round button (Figma I2855:278884;998:85782).
  // Vuetify marks the expand column's header and cells with --no-padding.
  :deep(.v-data-table-column--no-padding) {
    width: 48px;
    padding: 0 8px;
  }

  &__sort {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--d2e-color-primary);
      outline-offset: 2px;
    }
  }

  :deep(.d2e-data-table__detail-cell) {
    height: auto;
    padding: 8px 12px 12px 40px;
  }

  &__empty {
    color: var(--d2e-color-neutral);
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    background: var(--d2e-color-white);
  }

  &__size {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--d2e-font-body1-size);
    line-height: var(--d2e-font-body1-line-height);
  }

  &__size-select {
    width: 88px;
  }

  &__pager {
    display: flex;
    align-items: center;
    gap: 0;
  }

  &__range {
    margin-right: 8px;
    font-size: var(--d2e-font-body2-size);
    line-height: var(--d2e-font-body2-line-height);
  }
}
</style>
