<template>
  <div class="stackbar-mode-option" :class="{ active }">
    <div class="stackbar-mode-option__row" @click="$emit('select')">
      <span class="stackbar-mode-option__label">Overlapping Bar Chart</span>
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
  id: 'partialOverlaySolid',
  label: 'Overlapping Bar Chart',
  labelKey: 'MRI_PA_CHART_MODE_PARTIAL_OVERLAY_SOLID',
  hasDistributionOverlay: true,
}

type Ctx = {
  showDistributionOverlay: boolean
  barGap: number
  colorway: string[]
}

export function apply(traces: any[], layout: any, ctx: Ctx): { traces: any[]; layout: any } {
  layout.barmode = 'overlay'
  layout.bargap = ctx.barGap
  const n = traces.length
  // Create new trace objects so the canonical chartData.traces are never mutated.
  let newTraces: any[]
  if (n > 1) {
    const barWidth = (1 - ctx.barGap) * 0.68
    const offsetStep = (barWidth * 0.5) / (n - 1)
    const groupSpan = (n - 1) * offsetStep + barWidth
    newTraces = traces.map((trace, i) => ({
      ...trace,
      width: barWidth,
      offset: i * offsetStep - groupSpan / 2,
    }))
  } else {
    newTraces = traces
  }
  if (ctx.showDistributionOverlay) {
    appendDistributionOverlay(newTraces, layout, ctx.colorway)
  }
  return { traces: newTraces, layout }
}

export default {
  name: 'partialOverlaySolidMode',
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
