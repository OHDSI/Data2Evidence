<template>
  <!-- Figma 1783:373766: a label and value list in its own scroll panel, shown
       under an expanded D2eDataTable row. -->
  <dl class="d2e-data-table-detail" data-testid="d2e-data-table-detail">
    <div
      v-for="row in rows"
      :key="row.label"
      class="d2e-data-table-detail__line"
    >
      <dt class="d2e-data-table-detail__label">{{ row.label }}:</dt>
      <dd class="d2e-data-table-detail__value">{{ row.value }}</dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
interface Props {
  rows: { label: string; value: string }[];
}

defineProps<Props>();
</script>

<style scoped lang="scss">
.d2e-data-table-detail {
  max-height: 320px;
  margin: 0;
  overflow-y: auto;
  border: 1px solid var(--d2e-color-neutral-lightest);
  border-radius: 4px;
  background: var(--d2e-color-neutral-xtra-lightest);
  font-family: var(--d2e-font-family);

  &__line {
    display: grid;
    grid-template-columns: 140px 1fr;
    min-height: 32px;
    border-bottom: 1px solid var(--d2e-color-neutral-lighter);
  }

  &__label {
    padding: 8px 0;
    text-align: right;
    font-size: var(--d2e-font-subtitle2-size);
    font-weight: var(--d2e-font-subtitle2-weight);
    line-height: var(--d2e-font-subtitle2-line-height);
    color: var(--d2e-color-primary-light);
  }

  &__value {
    margin: 0;
    padding: 8px 16px;
    font-size: var(--d2e-font-body2-size);
    line-height: var(--d2e-font-body2-line-height);
    color: var(--d2e-color-neutral-black);
    // Query text and long descriptions wrap rather than widen the table.
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
}
</style>
