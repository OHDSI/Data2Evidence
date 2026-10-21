<template>
  <!-- Figma D2E Design System 2755:6060: right-aligned items per page,
       range, then first / previous / next / last. -->
  <div class="exploration-pagination" data-testid="explorations-pagination">
    <div class="exploration-pagination__size-group">
      <span id="exploration-pagination-size-label" class="exploration-pagination__label">
        {{ getText('MRI_PA_EXPLORATIONS_ROWS_PER_PAGE') }}
      </span>
      <div class="exploration-pagination__size">
        <select
          class="exploration-pagination__size-input"
          :value="pageSize"
          aria-labelledby="exploration-pagination-size-label"
          data-testid="explorations-page-size"
          @change="onPageSizeChange($event)"
        >
          <option v-for="size in PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
        </select>
        <v-icon icon="mdi-menu-down" size="24" class="exploration-pagination__size-arrow" />
      </div>
    </div>

    <span class="exploration-pagination__count">{{ pageLabelText }}</span>

    <div class="exploration-pagination__nav">
      <D2eIconButton
        category="no-stroke"
        size="sm"
        :disabled="page <= 1"
        :aria-label="getText('MRI_PA_EXPLORATIONS_PAGE_FIRST')"
        data-testid="explorations-page-first"
        @click="goTo(1)"
      >
        <ExplorationPaginationFirstIcon :size="24" />
      </D2eIconButton>

      <D2eIconButton
        category="no-stroke"
        size="sm"
        :disabled="page <= 1"
        :aria-label="getText('MRI_PA_EXPLORATIONS_PAGE_PREV')"
        data-testid="explorations-page-prev"
        @click="goTo(page - 1)"
      >
        <ExplorationPaginationPrevIcon :size="24" />
      </D2eIconButton>

      <D2eIconButton
        category="no-stroke"
        size="sm"
        :disabled="page >= totalPages"
        :aria-label="getText('MRI_PA_EXPLORATIONS_PAGE_NEXT')"
        data-testid="explorations-page-next"
        @click="goTo(page + 1)"
      >
        <ExplorationPaginationNextIcon :size="24" />
      </D2eIconButton>

      <D2eIconButton
        category="no-stroke"
        size="sm"
        :disabled="page >= totalPages"
        :aria-label="getText('MRI_PA_EXPLORATIONS_PAGE_LAST')"
        data-testid="explorations-page-last"
        @click="goTo(totalPages)"
      >
        <ExplorationPaginationLastIcon :size="24" />
      </D2eIconButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import { D2eIconButton } from '@d2e/ui'
import { PAGE_SIZES, pageCount, pageRange } from './helpers/explorationPaging'
import ExplorationPaginationFirstIcon from './icons/ExplorationPaginationFirstIcon.vue'
import ExplorationPaginationPrevIcon from './icons/ExplorationPaginationPrevIcon.vue'
import ExplorationPaginationNextIcon from './icons/ExplorationPaginationNextIcon.vue'
import ExplorationPaginationLastIcon from './icons/ExplorationPaginationLastIcon.vue'

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

const totalPages = computed(() => pageCount(props.total, props.pageSize))

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

const goTo = (page: number): void => {
  if (page < 1 || page > totalPages.value || page === props.page) return
  emit('update:page', page)
}

// Changing the page size returns to page 1: preserving the offset across a
// size change moves the user somewhere they did not ask to be.
const onPageSizeChange = (event: Event): void => {
  const size = Number((event.target as HTMLSelectElement).value)
  emit('update:pageSize', size)
  emit('update:page', 1)
}
</script>

<style scoped lang="scss">
.exploration-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  padding: var(--d2e-spacing-xs-s) var(--d2e-spacing-m);
  border-top: var(--d2e-border-width-sm) solid var(--d2e-color-neutral-lighter);
  background: var(--d2e-color-white);
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
      opacity: 0.26;
    }
  }

  &__label,
  &__count {
    font-size: var(--d2e-font-body2-size);
    font-weight: var(--d2e-font-body2-weight);
    line-height: 1.425;
    color: var(--d2e-color-neutral-black);
    white-space: nowrap;
  }

  &__count {
    min-width: 116px;
    padding-inline: var(--d2e-spacing-s);
    text-align: right;
  }

  &__size {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  // A native <select> matches the frame's plain box exactly; D2eSelect's
  // outlined field carries a floating label this control does not have.
  // `appearance: none` drops the UA's own arrow so only the mdi-menu-down
  // glyph shows.
  &__size-input {
    appearance: none;
    width: 90px;
    height: 40px;
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
