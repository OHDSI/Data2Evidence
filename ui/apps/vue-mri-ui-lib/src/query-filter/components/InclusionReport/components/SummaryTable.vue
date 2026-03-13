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
</style>
