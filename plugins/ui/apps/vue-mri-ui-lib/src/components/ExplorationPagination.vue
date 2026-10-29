<template>
  <D2ePagination
    class="exploration-pagination"
    test-id-prefix="explorations-pagination"
    :page="page"
    :items-per-page="pageSize"
    :total="total"
    :items-per-page-options="PAGE_SIZES"
    :items-per-page-label="getText('MRI_PA_EXPLORATIONS_ROWS_PER_PAGE')"
    :range-text="pageLabelText"
    :page-labels="pageLabels"
    @update:page="emit('update:page', $event)"
    @update:items-per-page="emit('update:pageSize', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import { D2ePagination } from '@d2e/ui'
import { PAGE_SIZES, pageRange } from './helpers/explorationPaging'

interface Props {
  /** Rows after filter and search, before paging. */
  total: number
  /** 1-based. */
  page: number
  pageSize: number
}

const props = defineProps<Props>()

const emit = defineEmits<{ 'update:page': [value: number]; 'update:pageSize': [value: number] }>()

const store = useStore()

// `param` must reach the store getter. Its signature is
// (key, param?: string | string[]) => string, and it substitutes {0}, {1}, ...
// A wrapper that accepted only `key` dropped the counts, so the label rendered
// its raw template, "{0}-{1} of {2}" rather than "1-12 of 24".
const getText = (key: string, param?: string | string[]): string => {
  const resolver = store.getters.getText
  return typeof resolver === 'function' ? resolver(key, param) : key
}

// The range is comma-grouped and locale-neutral; the word "of" (or its
// translation) and the empty form both come from i18n keys, so a translator
// controls the word order and punctuation around the counts.
const pageLabelText = computed(() => {
  const range = pageRange(props.total, props.page, props.pageSize)
  if (props.total === 0) {
    return getText('MRI_PA_EXPLORATIONS_PAGINATION_EMPTY', [range.startLabel, range.endLabel])
  }
  return getText('MRI_PA_EXPLORATIONS_PAGINATION_RESULT', [range.startLabel, range.endLabel, range.totalLabel])
})

const pageLabels = computed(() => ({
  first: getText('MRI_PA_EXPLORATIONS_PAGE_FIRST'),
  previous: getText('MRI_PA_EXPLORATIONS_PAGE_PREV'),
  next: getText('MRI_PA_EXPLORATIONS_PAGE_NEXT'),
  last: getText('MRI_PA_EXPLORATIONS_PAGE_LAST'),
}))
</script>

<style scoped lang="scss">
.exploration-pagination {
  flex-shrink: 0;
  padding: var(--d2e-spacing-xs-s) var(--d2e-spacing-m);
  border-top: var(--d2e-border-width-sm) solid var(--d2e-color-neutral-lighter);
  background: var(--d2e-color-white);
}
</style>
