<template>
  <div class="stackbar-mode-option" :class="{ active }">
    <div class="stackbar-mode-option__row" @click="$emit('select')">
      <span class="stackbar-mode-option__label">Partial Overlay (Solid)</span>
    </div>
    <label v-if="active" class="stackbar-mode-option__sub" @click.stop>
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
  label: 'Partial Overlay (Solid)',
  hasDistributionOverlay: true,
}

type Ctx = {
  showDistributionOverlay: boolean
  barGap: number
  colorway: string[]
}

export function apply(traces: any[], layout: any, ctx: Ctx) {
  layout.barmode = 'overlay'
  layout.bargap = ctx.barGap
  const n = traces.length
  if (n > 1) {
    const barWidth = (1 - ctx.barGap) * 0.68
    const offsetStep = (barWidth * 0.5) / (n - 1)
    const groupSpan = (n - 1) * offsetStep + barWidth
    traces.forEach((trace, i) => {
      trace.width = barWidth
      trace.offset = i * offsetStep - groupSpan / 2
    })
  }
  if (ctx.showDistributionOverlay) {
    appendDistributionOverlay(traces, layout, ctx.colorway)
  }
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
  font-size: 12px;
  user-select: none;
}
.stackbar-mode-option__row {
  padding: 6px 12px;
  cursor: pointer;
}
.stackbar-mode-option__row:hover {
  background: #f0f0f0;
}
.stackbar-mode-option.active .stackbar-mode-option__row {
  background: #e6f2ff;
  font-weight: 600;
}
.stackbar-mode-option__sub {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px 6px 24px;
  cursor: pointer;
  background: #f7fbff;
}
.stackbar-mode-option__sub input {
  margin: 0;
}
</style>
