<template>
  <div class="stackbar-mode-option" :class="{ active }" @click="$emit('select')">
    <span class="stackbar-mode-option__label">Stacked Bar Chart</span>
  </div>
</template>

<script lang="ts">
export const meta = {
  id: 'stack',
  label: 'Stacked Bar Chart',
  labelKey: 'MRI_PA_CHART_MODE_STACKED',
  hasDistributionOverlay: false,
}

type Ctx = {
  showDistributionOverlay: boolean
  barGap: number
  colorway: string[]
}

export function apply(traces: any[], layout: any, ctx: Ctx): { traces: any[]; layout: any } {
  layout.bargap = ctx.barGap
  return { traces, layout }
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
  height: 32px;
  line-height: 32px;
  padding: 0 8px;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}
.stackbar-mode-option:hover {
  color: var(--color-ui-darkest-text);
  background-color: var(--color-ui-highlight);
}
.stackbar-mode-option.active {
  color: var(--color-ui-darkest-text);
  background-color: var(--color-mri-dropdown-list-item-selected);
}
</style>
