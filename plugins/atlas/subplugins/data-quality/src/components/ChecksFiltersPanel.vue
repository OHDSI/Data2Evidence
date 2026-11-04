<script setup lang="ts">
/**
 * The Filters panel of the checks view: one multi-select per filterable field,
 * each offering only the values the loaded rows hold. It edits nothing in
 * place - every change emits a new CheckFilters.
 */
import { computed } from 'vue';
import { D2eButton, D2eSelect } from '@d2e/ui';
import { emptyFilters, type CheckFilters } from '../checks/filters';
import { formatSeverity } from '../checks/format';
import { STATUS_CHIP } from '../checks/status';
import type { Translate } from '../checks/types';

const props = defineProps<{
  modelValue: CheckFilters;
  options: CheckFilters;
  t: Translate;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: CheckFilters] }>();

type Field = keyof CheckFilters;

const FIELDS: { field: Field; key: string; fallback: string }[] = [
  { field: 'category', key: 'category', fallback: 'Category' },
  { field: 'severity', key: 'severity', fallback: 'Severity' },
  { field: 'subcategory', key: 'subcategory', fallback: 'Subcategory' },
  { field: 'context', key: 'context', fallback: 'Context' },
  { field: 'cdmTableName', key: 'table', fallback: 'Table' },
  { field: 'checkLevel', key: 'level', fallback: 'Level' },
  { field: 'status', key: 'status', fallback: 'Status' },
];

const items = computed(() =>
  Object.fromEntries(
    FIELDS.map(({ field }) => [
      field,
      props.options[field].map((value) => ({
        value,
        label:
          field === 'status'
            ? props.t(STATUS_CHIP[value as keyof typeof STATUS_CHIP].key, STATUS_CHIP[value as keyof typeof STATUS_CHIP].fallback)
            : field === 'severity'
              ? formatSeverity(value)
              : value,
      })),
    ]),
  ) as Record<Field, { value: string; label: string }[]>,
);

function patch(field: Field, value: string | string[] | null): void {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  emit('update:modelValue', { ...props.modelValue, [field]: values } as CheckFilters);
}

const isEmpty = computed(() => Object.values(props.modelValue).every((values) => values.length === 0));
</script>

<template>
  <div class="dq-checks-filters" data-testid="dq-checks-filters-panel">
    <header class="dq-checks-filters__header">
      <span class="dq-checks-filters__title">{{ t('plugins.dataQuality.checks.filters', 'Filters') }}</span>
      <!-- D2eMenu keeps the panel open on content clicks, and VMenu cancels
           Enter's default there; .prevent.stop keeps Enter from firing twice. -->
      <D2eButton
        variant="ghost"
        :disabled="isEmpty"
        data-testid="dq-checks-filters-clear"
        @click="emit('update:modelValue', emptyFilters())"
        @keydown.enter.prevent.stop="emit('update:modelValue', emptyFilters())"
      >
        {{ t('plugins.dataQuality.checks.clearFilters', 'Clear all') }}
      </D2eButton>
    </header>
    <div class="dq-checks-filters__body">
      <D2eSelect
        v-for="entry in FIELDS"
        :key="entry.field"
        size="sm"
        multiple
        searchable
        hide-details
        :items="items[entry.field]"
        :model-value="modelValue[entry.field]"
        :placeholder="t(`plugins.dataQuality.checks.column.${entry.key}`, entry.fallback)"
        :data-testid="`dq-checks-filter-${entry.field}`"
        @update:model-value="patch(entry.field, $event)"
      />
    </div>
  </div>
</template>

<style scoped>
/* The same paper and header as the explorations Filters panel (Figma
   2697:211983), so the two read as one control. D2eMenu paints no surface of
   its own when it is given content rather than items. */
.dq-checks-filters {
  width: 420px;
  overflow: hidden;
  background: var(--d2e-color-white);
  border-radius: var(--d2e-radius-md);
  box-shadow: var(--d2e-elevation-e8);
  font-family: var(--d2e-font-family);
}

.dq-checks-filters__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 var(--d2e-spacing-s);
  border-bottom: var(--d2e-border-width-sm) solid var(--d2e-color-neutral);
}

.dq-checks-filters__title {
  font-size: var(--d2e-font-caption2-size);
  font-weight: var(--d2e-font-subtitle1-weight);
  line-height: 1.5;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--d2e-color-primary);
}

.dq-checks-filters__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: var(--d2e-spacing-s);
}
</style>
