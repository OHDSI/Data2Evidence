<script setup lang="ts">
defineProps<{
  treemapChartRef: HTMLElement | null
}>()
</script>

<template>
  <div class="chart-section">
    <h4>Population visualization</h4>
    <div :ref="(el) => treemapChartRef = el as HTMLElement" class="treemap-chart"></div>
  </div>
</template>

