<script setup lang="ts">
import type { Summary } from '@/query-filter/types/InclusionReportTypes'

defineProps<{
  summary: Summary
}>()
</script>

<template>
  <div class="summary-section">
    <h4>Summary Statistics</h4>
    <div class="summary-data">
      <p>Total Persons: {{ summary.baseCount }}</p>
      <p>Matches: {{ summary.finalCount }} ({{ summary.percentMatched }})</p>
    </div>
    <!-- <table class="summary-table">
      <thead>
        <tr>
          <th>Total Persons</th>
          <th>Matches</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ summary.baseCount }}</td>
          <td>{{ summary.finalCount }} ({{ summary.percentMatched }})</td>
        </tr>
      </tbody>
    </table> -->
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
  font-weight: 500;
  color: var(--color-primary);
}
.summary-data {
  display: flex;
  gap: 2rem;
}

.summary-table {
  align-self: flex-start;
  min-width: 50%;
  max-width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--color-ui-light-border, #ddd);
  color: var(--color-ui-medium-text);
  text-align: left;
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
