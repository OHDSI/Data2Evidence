<script setup lang="ts">
import { computed, ref } from "vue";
import D2ePagination from "./D2ePagination.vue";

const total = 2340;
const page = ref(1);
const itemsPerPage = ref(10);

const rangeText = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value + 1;
  const end = Math.min(page.value * itemsPerPage.value, total);
  return `${start}-${end} of ${total}`;
});
</script>

<template>
  <Story title="D2ePagination" group="components">
    <Variant title="many pages">
      <D2ePagination
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :total="total"
        :items-per-page-options="[10, 25, 50]"
        items-per-page-label="Rows per page:"
        :range-text="rangeText"
      />
    </Variant>
    <Variant title="one page: all four buttons disabled">
      <D2ePagination
        :page="1"
        :items-per-page="12"
        :total="2"
        :items-per-page-options="[12, 24, 48]"
        items-per-page-label="Items per page:"
        range-text="1-2 of 2"
      />
    </Variant>
    <Variant title="no results">
      <D2ePagination
        :page="1"
        :items-per-page="12"
        :total="0"
        :items-per-page-options="[12, 24, 48]"
        items-per-page-label="Items per page:"
        range-text="0 of 0"
      />
    </Variant>
  </Story>
</template>
