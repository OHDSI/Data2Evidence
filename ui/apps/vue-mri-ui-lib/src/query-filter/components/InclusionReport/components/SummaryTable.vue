<script setup lang="ts">
import type { Summary } from '@/query-filter/types/InclusionReportTypes'

defineProps<{
  summary: Summary
}>()
</script>

<template>
  <div class="summary-section">
    <h4>Summary</h4>
    <table class="summary-table">
      <thead>
        <tr>
          <th>Match rate</th>
          <th>Matches</th>
          <th>Total events</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ summary.percentMatched }}</td>
          <td>{{ summary.finalCount }}</td>
          <td>{{ summary.baseCount }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped lang="scss">
.summary-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary);
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--color-ui-light-border, #ddd);
  text-align: right;
  color: var(--color-ui-medium-text);

  thead {
    background-color: var(--color-ui-extra-light-bg, #ddd);
  }

  th {
    padding: 0.5rem;
    font-weight: 500;
    border-bottom: 2px solid var(--color-ui-light-border, #ddd);
    color: #333;
  }

  td {
    padding: 0.5rem;
    cursor: inherit;
  }

  tr {
    border-bottom: 1px solid var(--color-ui-light-border, #ddd);
  }

  tbody tr:hover {
    background-color: var(--color-ui-extra-light-bg, #ddd);
  }
}
</style>
