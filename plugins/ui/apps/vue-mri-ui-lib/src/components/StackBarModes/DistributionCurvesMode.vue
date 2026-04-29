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

// Try to interpret a 1D x-array as numeric positions. Returns null when the data is
// multi-level or any value is not a finite number, so the caller can fall back to
// index-space behavior for categorical data.
function tryParseNumericPositions(origX: any[]): number[] | null {
  if (!origX.length || Array.isArray(origX[0])) return null
  const positions: number[] = []
  for (const v of origX) {
    const n = typeof v === 'number' ? v : parseFloat(String(v))
    if (!Number.isFinite(n)) return null
    positions.push(n)
  }
  return positions
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

  const xPositions = tryParseNumericPositions(origX)
  let xMin: number
  let xMax: number
  let tickvals: number[]
  let kdeOptions: { xMin: number; xMax: number; xPositions?: number[] }

  if (xPositions && xPositions.length === numCategories) {
    xMin = Math.min(...xPositions)
    xMax = Math.max(...xPositions)
    if (xMin === xMax) {
      xMin -= 0.5
      xMax += 0.5
    }
    tickvals = xPositions
    kdeOptions = { xMin, xMax, xPositions }
  } else {
    xMin = -0.5
    xMax = numCategories - 0.5
    tickvals = categoryLabels.map((_: unknown, i: number) => i)
    kdeOptions = { xMin, xMax }
  }

  const { xGrid, perTrace } = computeKDE(traces, kdeOptions)

  const kdeTraces = traces
    .map((trace, i) => {
      const kde = perTrace[i]
      if (!kde) return null

      const origCustomdata = trace.customdata || []
      const counts = trace.y || []
      const perPointCustomdata = xGrid.map((gx: number) => {
        let nearestIdx = 0
        let nearestDist = Infinity
        for (let k = 0; k < tickvals.length; k++) {
          const d = Math.abs(gx - tickvals[k])
          if (d < nearestDist) {
            nearestDist = d
            nearestIdx = k
          }
        }
        return {
          ...(origCustomdata[nearestIdx] || {}),
          count: counts[nearestIdx],
        }
      })

      const orig = trace.hovertemplate || ''
      const marker = ': <b>%{y:,}</b>'
      const yIdx = orig.indexOf(marker)
      let hoverTemplate: string
      if (yIdx >= 0) {
        const prefix = orig.slice(0, yIdx + marker.length).replace('%{y:,}', '%{customdata.count:,}')
        hoverTemplate = prefix + '<br>Density: <b>%{y:.4f}</b><extra></extra>'
      } else {
        hoverTemplate = '%{x}<br>Density: <b>%{y:.4f}</b><extra></extra>'
      }

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
        customdata: perPointCustomdata,
        hovertemplate: hoverTemplate,
      }
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)

  traces.length = 0
  kdeTraces.forEach(t => traces.push(t))

  layout.xaxis.type = 'linear'
  layout.xaxis.tickvals = tickvals
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
