<script setup lang="ts">
import { computed, ref } from "vue";
import D2eDataTable from "./D2eDataTable.vue";
import D2eDataTableDetail from "./D2eDataTableDetail.vue";
import D2eStatusChip from "./D2eStatusChip.vue";
import type { D2eSortItem } from "./dataTable";

const headers = [
  { key: "category", title: "Category", sortable: true },
  { key: "checkName", title: "Check name", sortable: true },
  { key: "table", title: "Table", sortable: true },
  { key: "status", title: "Status", sortable: true },
];

const rows = Array.from({ length: 23 }, (_, index) => ({
  key: `row-${index}`,
  category: ["Plausibility", "Conformance", "Completeness"][index % 3],
  checkName: `plausibleValueLow${index}`,
  table: index % 2 ? "Measurement" : "Person",
  status: index % 4 ? "Failed" : "Passed",
}));

const sortBy = ref<D2eSortItem[]>([]);
const page = ref(1);
const itemsPerPage = ref(10);
const expanded = ref<string[]>([]);

// The table is controlled: the story sorts, as a real caller would.
const sorted = computed(() => {
  const [active] = sortBy.value;
  if (!active) return rows;
  const direction = active.order === "asc" ? 1 : -1;
  return [...rows].sort(
    (a, b) =>
      direction *
      String(a[active.key as keyof typeof a]).localeCompare(
        String(b[active.key as keyof typeof b]),
      ),
  );
});
</script>

<template>
  <Story title="D2eDataTable" group="components">
    <Variant title="sort, expand, pagination">
      <D2eDataTable
        v-model:sort-by="sortBy"
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        v-model:expanded="expanded"
        :headers="headers"
        :items="sorted"
        item-value="key"
        expandable
      >
        <template #item.category="{ value }">
          <D2eStatusChip variant="category" :label="String(value)" />
        </template>
        <template #item.status="{ value }">
          <D2eStatusChip
            :variant="value === 'Failed' ? 'negative' : 'positive'"
            :label="String(value)"
          />
        </template>
        <template #expanded-row="{ item }">
          <D2eDataTableDetail
            :rows="[
              { label: 'Check name', value: String(item.checkName) },
              { label: 'Table', value: String(item.table) },
              { label: 'Notes', value: '-' },
            ]"
          />
        </template>
      </D2eDataTable>
    </Variant>
    <Variant title="empty">
      <D2eDataTable :headers="headers" :items="[]" item-value="key" />
    </Variant>
  </Story>
</template>
