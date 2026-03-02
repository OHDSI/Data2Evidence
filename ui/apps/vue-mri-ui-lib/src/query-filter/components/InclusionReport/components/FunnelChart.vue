<script setup lang="ts">
defineProps<{
  funnelChartRef: HTMLElement | null
}>()
</script>

<template>
  <div class="chart-section">
    <h4>Attrition visualization</h4>
    <div :ref="(el) => funnelChartRef = el as HTMLElement" class="funnel-chart"></div>
  </div>
</template>

