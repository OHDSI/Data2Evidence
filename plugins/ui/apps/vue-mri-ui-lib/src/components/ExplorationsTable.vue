<template>
  <D2eDataTable
    class="explorations-table"
    density="compact"
    hover
    hide-footer
    item-value="id"
    :headers="headers"
    :items="rows"
    :items-per-page="-1"
    :sort-by="sortBy"
    data-testid="explorations-table"
    @update:sort-by="emit('update:sortBy', $event)"
    @click:row="emit('open', $event)"
  >
    <template #sort-icon="{ order }">
      <ExplorationSortIcon v-if="!order" :size="SORT_ICON_SIZE" />
      <v-icon v-else :icon="DATA_TABLE_STYLE_MAP.sortIcons[order]" :size="SORT_ICON_SIZE" />
    </template>

    <template #[`item.name`]="{ item }">
      <D2eTruncatedText
        class="explorations-table__text explorations-table__name"
        :text="item.name"
        :data-testid="`explorations-row-name-${item.id}`"
      />
    </template>

    <template #[`item.description`]="{ item }">
      <D2eTruncatedText class="explorations-table__text" :text="item.description" />
    </template>

    <template #[`item.createdBy`]="{ item }">
      <D2eTruncatedText class="explorations-table__text" :text="item.createdBy" />
    </template>

    <template #[`item.status`]="{ item }">
      <D2eStatusChip
        :variant="EXPLORATION_STATUS_MAP[item.status].variant"
        :label="EXPLORATION_STATUS_MAP[item.status].label"
        :icon="EXPLORATION_STATUS_MAP[item.status].icon"
      />
    </template>

    <template #[`item.actions`]="{ item }">
      <span class="explorations-table__actions" @click.stop>
        <D2eMenu
          width="max-content"
          density="compact"
          location="bottom end"
          :items="menuItems(item)"
          @select="emit('select', item, $event)"
        >
          <template #activator="activatorProps">
            <D2eIconButton
              v-bind="activatorProps"
              category="no-stroke"
              size="sm"
              :aria-label="getText('MRI_PA_EXPLORATIONS_MORE_ACTIONS')"
              :data-testid="`explorations-row-more-btn-${item.id}`"
            >
              <ExplorationMoreIcon :size="MORE_ICON_SIZE" />
            </D2eIconButton>
          </template>
        </D2eMenu>
      </span>
    </template>
  </D2eDataTable>
</template>

<script setup lang="ts" generic="T extends ExplorationTableRow">
import { computed } from 'vue'
import { useStore } from 'vuex'
import {
  D2eDataTable,
  D2eIconButton,
  D2eMenu,
  D2eStatusChip,
  D2eTruncatedText,
  DATA_TABLE_STYLE_MAP,
  EXPLORATION_STATUS_MAP,
  type D2eDataTableHeader,
  type D2eMenuItem,
  type D2eSortItem,
} from '@d2e/ui'
import ExplorationMoreIcon from './icons/ExplorationMoreIcon.vue'
import ExplorationSortIcon from './icons/ExplorationSortIcon.vue'
import type { ExplorationTableRow } from './helpers/explorationTableRow'

const SORT_ICON_SIZE = 16
const MORE_ICON_SIZE = 20
const COLUMN_WIDTHS = { name: 180, version: 90, actions: 40 } as const

defineProps<{
  rows: T[]
  sortBy: D2eSortItem[]
  menuItems: (row: T) => D2eMenuItem[]
}>()

const emit = defineEmits<{
  (e: 'update:sortBy', value: D2eSortItem[]): void
  (e: 'open', row: T): void
  (e: 'select', row: T, value: string): void
}>()

const store = useStore()

const getText = (key: string): string => {
  const resolver = store.getters.getText
  return typeof resolver === 'function' ? resolver(key) : key
}

const headers = computed<D2eDataTableHeader[]>(() => [
  { key: 'name', title: getText('MRI_PA_EXPLORATIONS_COL_NAME'), sortable: true, width: COLUMN_WIDTHS.name },
  { key: 'description', title: getText('MRI_PA_EXPLORATIONS_COL_DESCRIPTION') },
  { key: 'status', title: getText('MRI_PA_EXPLORATIONS_COL_STATUS'), sortable: true },
  { key: 'personCount', title: getText('MRI_PA_EXPLORATIONS_COL_PERSON_COUNT'), sortable: true },
  { key: 'lastMaterialized', title: getText('MRI_PA_EXPLORATIONS_COL_LAST_MATERIALIZED'), sortable: true },
  { key: 'cohortId', title: getText('MRI_PA_EXPLORATIONS_COL_COHORT_ID'), sortable: true },
  { key: 'createdBy', title: getText('MRI_PA_EXPLORATIONS_COL_CREATED_BY'), sortable: true },
  { key: 'lastUpdated', title: getText('MRI_PA_EXPLORATIONS_COL_LAST_UPDATED'), sortable: true },
  { key: 'version', title: getText('MRI_PA_EXPLORATIONS_COL_VERSION'), width: COLUMN_WIDTHS.version },
  { key: 'actions', title: '', width: COLUMN_WIDTHS.actions },
])
</script>

<style scoped lang="scss">
.explorations-table {
  padding: 0 var(--d2e-spacing-m);

  :deep(.v-table > .v-table__wrapper > table > tbody > tr) {
    cursor: pointer;
  }

  :deep(.v-table > .v-table__wrapper > table > thead > tr > th:last-child),
  :deep(.v-table > .v-table__wrapper > table > tbody > tr > td:last-child) {
    padding: 0;
    text-align: center;
  }

  &__text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__name {
    font-weight: var(--d2e-font-button-weight);
  }

  &__actions {
    display: inline-flex;
    color: var(--d2e-color-primary);
  }
}
</style>
