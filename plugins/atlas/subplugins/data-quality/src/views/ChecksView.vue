<script setup lang="ts">
/**
 * The Data quality checks view (#3333, #3335): every DQD check of the latest run,
 * with search, filters, column show/hide, sort, pagination, expandable detail and
 * a download of exactly the rows on screen. Figma 1801:210534 (the vue-mri
 * dialog's tab) and 1783:373519 (the Data sources page).
 *
 * The same view serves both hosts. The run is the cohort's when the host passes
 * a cohortDefinitionId and the data source's otherwise, and every state before
 * results is RunState's, as on the dashboard. On the Data sources page it titles
 * itself; in the dialog the tab already does.
 *
 * The table is controlled: visibleRows() searches, filters and sorts here, and
 * D2eDataTable shows that list in that order. Download writes the same list.
 */
import { computed, ref, watch } from 'vue';
import {
  D2eButton,
  D2eDataTable,
  D2eDataTableDetail,
  D2eIconButton,
  D2eMenu,
  D2eSearchField,
  D2eSplitButton,
  D2eStatusChip,
  type D2eSortItem,
} from '@d2e/ui';
import ChecksColumnMenu from '../components/ChecksColumnMenu.vue';
import ChecksFiltersPanel from '../components/ChecksFiltersPanel.vue';
import RunState from '../components/RunState.vue';
import { COLUMN_BY_KEY, COLUMNS, DEFAULT_VISIBLE_KEYS, displayValue } from '../checks/columns';
import { detailRows } from '../checks/detail';
import { downloadText, exportFileName, toCsv, toJson } from '../checks/export';
import { activeFilterCount, emptyFilters, filterOptions, type CheckFilters } from '../checks/filters';
import { visibleRows } from '../checks/pipeline';
import { deriveStatus, STATUS_CHIP } from '../checks/status';
import type { DqdCheckRow } from '../checks/types';
import { useDataQualityChecks } from '../composables/useDataQualityChecks';
import { useHostContext } from '../composables/useHostContext';

const ctx = useHostContext();
const { t } = ctx;
const { status, rows, flowRunStateType, errorMessage, retry } = useDataQualityChecks(
  ctx.datasetId,
  ctx.getToken,
  ctx.cohortDefinitionId,
);

const showTitle = computed(() => ctx.surface.value === 'datasource-sidebar');

const query = ref('');
const filters = ref<CheckFilters>(emptyFilters());
const sortBy = ref<D2eSortItem[]>([]);
const visibleKeys = ref<string[]>([...DEFAULT_VISIBLE_KEYS]);
const page = ref(1);
const itemsPerPage = ref(10);
const expanded = ref<string[]>([]);

watch([ctx.datasetId, ctx.cohortDefinitionId], () => {
  query.value = '';
  filters.value = emptyFilters();
});

watch(rows, () => {
  expanded.value = [];
});

const shown = computed(() =>
  visibleRows(rows.value, {
    query: query.value,
    filters: filters.value,
    sortBy: sortBy.value,
    visibleKeys: visibleKeys.value,
  }),
);

// A narrower result starts at its first page, not on a page that no longer exists.
watch([query, filters, visibleKeys], () => {
  page.value = 1;
});

const options = computed(() => filterOptions(rows.value));
const filterCount = computed(() => activeFilterCount(filters.value));

const headers = computed(() =>
  COLUMNS.filter((column) => visibleKeys.value.includes(column.key)).map((column) => ({
    key: column.key,
    title: t(`plugins.dataQuality.checks.column.${column.titleKey}`, column.fallback),
    sortable: true,
  })),
);

const statusChip = (row: DqdCheckRow) => {
  const chip = STATUS_CHIP[deriveStatus(row)];
  return { variant: chip.variant, label: t(chip.key, chip.fallback) };
};

const downloadItems = computed(() => [
  { label: t('plugins.dataQuality.checks.downloadCsv', 'Download as CSV'), value: 'csv' },
  { label: t('plugins.dataQuality.checks.downloadJson', 'Download as JSON'), value: 'json' },
]);

function download(kind: string): void {
  if (kind === 'json') {
    downloadText(toJson(shown.value), exportFileName('json'), 'application/json');
    return;
  }
  // The byte-order mark makes Excel read the file as UTF-8.
  downloadText(`﻿${toCsv(shown.value)}`, exportFileName('csv'), 'text/csv;charset=utf-8');
}

const rangeLabel = (start: number, end: number, total: number) =>
  t('plugins.dataQuality.checks.range', '{start}-{end} of {total}')
    .replace('{start}', String(start))
    .replace('{end}', String(end))
    .replace('{total}', String(total));

const pageLabels = computed(() => ({
  first: t('plugins.dataQuality.checks.pageFirst', 'First page'),
  previous: t('plugins.dataQuality.checks.pagePrevious', 'Previous page'),
  next: t('plugins.dataQuality.checks.pageNext', 'Next page'),
  last: t('plugins.dataQuality.checks.pageLast', 'Last page'),
}));
</script>

<template>
  <!-- `dq-root` carries the --dq-* tokens RunState reads and the host inset, and
       it is what the vue-mri dialog's `.mri-dq-modal__host .dq-root` targets. -->
  <div class="dq-root dq-checks" data-testid="dq-checks">
    <h2 v-if="showTitle" class="dq-checks__title">
      {{ t('plugins.dataQuality.checks.title', 'Data quality checks') }}
    </h2>

    <RunState
      v-if="status !== 'ready'"
      :status="status"
      :flow-run-state-type="flowRunStateType"
      :error-message="errorMessage"
      @retry="retry"
    />

    <template v-else>
      <div class="dq-checks__toolbar">
        <div class="dq-checks__toolbar-left">
          <D2eSearchField
            v-model="query"
            class="dq-checks__search"
            :placeholder="t('plugins.dataQuality.checks.search', 'Search')"
            data-testid="dq-checks-search"
          />
          <D2eMenu location="bottom start" :items="[]">
            <template #activator="activatorProps">
              <D2eButton
                v-bind="activatorProps"
                variant="secondary"
                prepend-icon="mdi-filter-variant"
                data-testid="dq-checks-filters"
              >
                {{ t('plugins.dataQuality.checks.filters', 'Filters')
                }}<template v-if="filterCount > 0"> ({{ filterCount }})</template>
              </D2eButton>
            </template>
            <ChecksFiltersPanel v-model="filters" :options="options" :t="t" />
          </D2eMenu>
        </div>

        <div class="dq-checks__toolbar-right">
          <D2eMenu :width="240" location="bottom end" :items="[]">
            <template #activator="activatorProps">
              <D2eIconButton
                v-bind="activatorProps"
                icon="mdi-view-column"
                :ariaLabel="t('plugins.dataQuality.checks.columns', 'Show/hide columns')"
                data-testid="dq-checks-columns"
              />
            </template>
            <ChecksColumnMenu v-model="visibleKeys" :t="t" />
          </D2eMenu>
          <D2eSplitButton
            :label="t('plugins.dataQuality.checks.download', 'Download')"
            icon="mdi-tray-arrow-down"
            :items="downloadItems"
            :menu-label="t('plugins.dataQuality.checks.downloadFormat', 'Choose a download format')"
            data-testid="dq-checks-download"
            @click="download('csv')"
            @select="download"
          />
        </div>
      </div>

      <D2eDataTable
        v-model:sort-by="sortBy"
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        v-model:expanded="expanded"
        :headers="headers"
        :items="shown"
        item-value="key"
        expandable
        :no-data-text="t('plugins.dataQuality.checks.noMatches', 'No checks match the current search and filters.')"
        :rows-per-page-label="t('plugins.dataQuality.checks.rowsPerPage', 'Rows per page:')"
        :range-label="rangeLabel"
        :page-labels="pageLabels"
        :expand-label="t('plugins.dataQuality.checks.showDetails', 'Show details')"
        data-testid="dq-checks-table"
      >
        <template #item.category="{ item }">
          <D2eStatusChip variant="category" :label="item.category" />
        </template>
        <template #item.status="{ item }">
          <D2eStatusChip v-bind="statusChip(item)" />
        </template>
        <template #item.severity="{ item }">{{ displayValue(COLUMN_BY_KEY.severity, item) }}</template>
        <template #item.pctViolatedRows="{ item }">{{ displayValue(COLUMN_BY_KEY.pctViolatedRows, item) }}</template>
        <template #expanded-row="{ item }">
          <D2eDataTableDetail :rows="detailRows(item, t)" />
        </template>
      </D2eDataTable>
    </template>
  </div>
</template>

<style scoped>
.dq-checks__title {
  margin: 0 0 16px;
  font-family: var(--d2e-font-family);
  font-size: var(--d2e-font-heading5-size);
  font-weight: var(--d2e-font-heading5-weight);
  line-height: var(--d2e-font-heading5-line-height);
  color: var(--d2e-color-primary);
}

/* Figma 2855:278228: the host card already pads 24, so only the rule under
   the toolbar is this view's. */
.dq-checks__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 8px;
}

.dq-checks__toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dq-checks__toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dq-checks__search {
  width: 380px;
}
</style>
