<template>
  <div class="stackbar-mode-option" :class="{ active }">
    <div class="stackbar-mode-option__row" @click="$emit('select')">
      <span class="stackbar-mode-option__label">Overlapping</span>
    </div>
    <label class="stackbar-mode-option__sub" @click.stop>
      <input
        type="checkbox"
        :checked="showDistributionOverlay"
        @change="$emit('update:showDistributionOverlay', ($event.target as HTMLInputElement).checked)"
      />
      Distribution Curve
    </label>
  </div>
</template>

<script lang="ts">
import { appendDistributionOverlay } from '../helpers/computeDistributionKDE'

export const meta = {
  id: 'overlay',
  label: 'Overlapping Histogram',
  labelKey: 'MRI_PA_CHART_MODE_OVERLAY',
  hasDistributionOverlay: true,
  configFlag: 'overlappingHistogramEnabled',
}

export const OVERLAY_BAR_OPACITY = 0.3

type Ctx = {
  showDistributionOverlay: boolean
  barGap: number
  colorway: string[]
}

export function apply(traces: any[], layout: any, ctx: Ctx): { traces: any[]; layout: any } {
  layout.barmode = 'overlay'
  layout.bargap = 0
  // Create new trace objects so the canonical chartData.traces are never mutated.
  const newTraces = traces.map(trace => ({
    ...trace,
    marker: { ...trace.marker, opacity: OVERLAY_BAR_OPACITY },
  }))
  if (ctx.showDistributionOverlay) {
    // appendDistributionOverlay pushes to newTraces (safe — it's a fresh array) and
    // mutates layout properties (safe — layout is always a fresh object from buildPlotlyLayout).
    appendDistributionOverlay(newTraces, layout, ctx.colorway)
  }
  return { traces: newTraces, layout }
}

export default {
  name: 'overlayMode',
  props: {
    active: { type: Boolean, default: false },
    showDistributionOverlay: { type: Boolean, default: false },
  },
  emits: ['select', 'update:showDistributionOverlay'],
}
</script>

<style scoped>
.stackbar-mode-option {
  user-select: none;
}
.stackbar-mode-option__row {
  height: 32px;
  line-height: 32px;
  padding: 0 8px;
  cursor: pointer;
  white-space: nowrap;
}
.stackbar-mode-option__row:hover {
  color: var(--color-ui-darkest-text);
  background-color: var(--color-ui-highlight);
}
.stackbar-mode-option.active .stackbar-mode-option__row {
  color: var(--color-ui-darkest-text);
  background-color: var(--color-mri-dropdown-list-item-selected);
}
.stackbar-mode-option__sub {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 8px 0 24px;
  cursor: pointer;
  color: var(--color-ui-darkest-text);
}
.stackbar-mode-option__sub input {
  margin: 0;
}
</style>
