<template>
  <div class="stackbar-mode-option" :class="{ active }" @click="$emit('select')">
    <span class="stackbar-mode-option__label">Kernel Density Plot</span>
  </div>
</template>

<script lang="ts">
import { computeKDE } from '../helpers/computeDistributionKDE'

export const meta = {
  id: 'distribution',
  label: 'Kernel Density Plot',
  hasDistributionOverlay: false,
}

type Ctx = {
  showDistributionOverlay: boolean
  barGap: number
  colorway: string[]
}

export function apply(traces: any[], layout: any, ctx: Ctx) {
  layout.barmode = 'overlay'
  layout.bargap = ctx.barGap

  const numCategories = traces[0]?.y?.length || 0
  if (numCategories <= 1) return

  const origX = traces[0]?.x || []
  const categoryLabels = Array.isArray(origX[0])
    ? origX[0].map((_: unknown, ci: number) => origX.map((level: any) => level[ci]).join(' / '))
    : origX.map(String)

  const xMin = -0.5
  const xMax = numCategories - 0.5
  const { xGrid, perTrace } = computeKDE(traces, { xMin, xMax })

  const kdeTraces = traces
    .map((trace, i) => {
      const kde = perTrace[i]
      if (!kde) return null
      return {
        x: xGrid,
        y: kde.density,
        type: 'scatter',
        mode: 'lines',
        name: trace.name,
        meta: trace.meta,
        line: { color: ctx.colorway[i % ctx.colorway.length], width: 2 },
        fill: 'tozeroy',
        fillcolor: ctx.colorway[i % ctx.colorway.length] + '30',
        showlegend: trace.showlegend,
        hoverinfo: 'skip',
      }
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)

  traces.length = 0
  kdeTraces.forEach(t => traces.push(t))

  layout.xaxis.type = 'linear'
  layout.xaxis.tickvals = categoryLabels.map((_: unknown, i: number) => i)
  layout.xaxis.ticktext = categoryLabels
  layout.xaxis.range = [xMin, xMax]
  layout.xaxis.autorange = false
  layout.xaxis.zeroline = false
  layout.xaxis.tickson = 'labels'
  delete layout.xaxis.dividercolor
  delete layout.xaxis.labelalias
  layout.yaxis.rangemode = 'nonnegative'
}

export default {
  name: 'distributionCurvesMode',
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
