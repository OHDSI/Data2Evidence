<template>
  <div class="stackbar-mode-option" :class="{ active }" @click="$emit('select')">
    <span class="stackbar-mode-option__label">Stacked</span>
  </div>
</template>

<script lang="ts">
export const meta = {
  id: 'stack',
  label: 'Stacked',
  hasDistributionOverlay: false,
}

type Ctx = {
  showDistributionOverlay: boolean
  barGap: number
  colorway: string[]
}

export function apply(_traces: any[], layout: any, ctx: Ctx) {
  layout.bargap = ctx.barGap
}

export default {
  name: 'stackedMode',
  props: {
    active: { type: Boolean, default: false },
  },
  emits: ['select'],
}
</script>

<style scoped>
.stackbar-mode-option {
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
  user-select: none;
}
.stackbar-mode-option:hover {
  background: #f0f0f0;
}
.stackbar-mode-option.active {
  background: #e6f2ff;
  font-weight: 600;
}
</style>
