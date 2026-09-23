<script setup lang="ts">
/**
 * Show and hide the checks table's columns - the portal DQD table's "show/hide
 * all" menu. Check name always stays, so the table never has no columns.
 */
import { D2eButton, D2eCheckbox } from '@d2e/ui';
import { COLUMNS } from '../checks/columns';
import type { Translate } from '../checks/types';

const ALWAYS_SHOWN = 'checkName';

const props = defineProps<{ modelValue: string[]; t: Translate }>();
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();

// Visible keys keep COLUMNS order whatever order they were ticked in.
const inOrder = (keys: Set<string>): string[] => COLUMNS.map((c) => c.key).filter((key) => keys.has(key));

function toggle(key: string, shown: boolean): void {
  const next = new Set(props.modelValue);
  if (shown) next.add(key);
  else if (key !== ALWAYS_SHOWN) next.delete(key);
  emit('update:modelValue', inOrder(next));
}
</script>

<template>
  <div class="dq-checks-columns" data-testid="dq-checks-columns-panel">
    <div class="dq-checks-columns__actions">
      <D2eButton
        variant="ghost"
        size="sm"
        data-testid="dq-checks-columns-show-all"
        @click="emit('update:modelValue', COLUMNS.map((c) => c.key))"
      >
        {{ t('plugins.dataQuality.checks.showAll', 'Show all') }}
      </D2eButton>
      <D2eButton
        variant="ghost"
        size="sm"
        data-testid="dq-checks-columns-hide-all"
        @click="emit('update:modelValue', [ALWAYS_SHOWN])"
      >
        {{ t('plugins.dataQuality.checks.hideAll', 'Hide all') }}
      </D2eButton>
    </div>
    <D2eCheckbox
      v-for="column in COLUMNS"
      :key="column.key"
      :model-value="modelValue.includes(column.key)"
      :disabled="column.key === ALWAYS_SHOWN"
      :label="t(`plugins.dataQuality.checks.column.${column.titleKey}`, column.fallback)"
      :data-testid="`dq-checks-column-${column.key}`"
      @update:model-value="toggle(column.key, $event)"
    />
  </div>
</template>

<style scoped>
/* D2eMenu paints no surface of its own when it is given content. */
.dq-checks-columns {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 16px 12px;
  background: var(--d2e-color-white);
  border-radius: var(--d2e-radius-md);
  box-shadow: var(--d2e-elevation-e8);
  font-family: var(--d2e-font-family);
}

.dq-checks-columns__actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
</style>
