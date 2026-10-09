<template>
  <div class="ds-sort">
    <D2eMenu
      :items="items"
      location="bottom end"
      width="max-content"
      content-class="ds-sort__menu"
      @select="onSelect"
    >
      <template #activator="activatorProps">
        <AtlasButton
          v-bind="activatorProps"
          variant="ghost"
          data-testid="ds-sort"
          class="ds-sort-btn"
          prepend-icon="mdi-sort"
        >
          Sort by: {{ sortLabel }}
        </AtlasButton>
      </template>
    </D2eMenu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasButton } from '@ohdsi/atlas-ui'
import { D2eMenu } from '@d2e/ui'
import type { D2eMenuItem } from '@d2e/ui'
import type { SortMode } from '../composables/useDatasourceCatalog'

const props = defineProps<{ modelValue: SortMode; isLoggedIn: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', mode: SortMode): void }>()

const SORT_LABELS: Record<SortMode, string> = {
  access: 'Access', 'name-asc': 'Name A-Z', 'name-desc': 'Name Z-A',
}
const sortLabel = computed(() => SORT_LABELS[props.modelValue])

// D2eMenu owns the dropdown chrome (panel + rows + selected state), so this
// just supplies the items and marks the active one.
const items = computed<D2eMenuItem[]>(() => {
  const names: D2eMenuItem[] = [
    { value: 'name-asc', label: 'Name A-Z' },
    { value: 'name-desc', label: 'Name Z-A' },
  ]
  const all = props.isLoggedIn
    ? [{ value: 'access', label: 'Access' } as D2eMenuItem, ...names]
    : names
  return all.map((o) => ({ ...o, selected: props.modelValue === o.value }))
})

function onSelect(value: string): void {
  emit('update:modelValue', value as SortMode)
}
</script>

<style scoped>
.ds-sort {
  white-space: nowrap;
}
.ds-sort-btn {
  font-family: var(--ds-font-body) !important;
  font-size: 16px !important;
  font-weight: 500 !important;
  line-height: 16px !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  color: var(--ds-text) !important;
}
.ds-sort-btn :deep(.v-btn__content),
.ds-sort-btn :deep(.v-icon) {
  color: inherit !important;
}
.ds-sort-btn[aria-expanded="true"] {
  color: var(--ds-primary) !important;
  background-color: var(--ds-sort-active-bg) !important;
}
.ds-sort-btn:focus,
.ds-sort-btn:focus-visible {
  outline: none !important;
}
.ds-sort-btn :deep(.v-btn__overlay) {
  display: none !important;
}
</style>

<!--
  D2eMenu teleports its panel into a Vuetify overlay (content-class is forwarded
  to VMenu), so this lives outside the scoped block and keys on that class. With
  the panel at width:max-content, min-width floors it while still letting it grow
  to fit a longer label.
-->
<style>
.ds-sort__menu .d2e-menu {
  min-width: 200px;
}
</style>
