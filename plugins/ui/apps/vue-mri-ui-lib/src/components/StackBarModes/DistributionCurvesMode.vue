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

// Matches binned labels produced by makeBinLabel: "from - to" with optional parentheses
// around negative endpoints, e.g. "10 - 20" or "(-20) - (-10)".
const BIN_LABEL_RE = /^\(?(-?\d+(?:\.\d+)?)\)?\s*-\s*\(?(-?\d+(?:\.\d+)?)\)?$/

type ParsedPositions = {
  // Bin centers used as kernel placement points.
  centers: number[]
  // Outer edges of the data range covered by the bars: left edge of the first bin and
  // right edge of the last bin. Equal to centers[0]/centers[n-1] when labels are plain
  // numeric values rather than "from - to" ranges.
  dataMin: number
  dataMax: number
}

// Try to interpret a 1D x-array as numeric positions. Returns null when the data is
// multi-level or any value is not a finite number, so the caller can fall back to
// index-space behavior for categorical data. Binned labels are resolved to bin centers,
// and the bin edges are tracked so the caller can use the full data range for the axis.
function tryParseNumericPositions(origX: any[]): ParsedPositions | null {
  if (!origX.length || Array.isArray(origX[0])) return null
  const centers: number[] = []
  const lefts: number[] = []
  const rights: number[] = []
  for (const v of origX) {
    const s = String(v).trim()
    const m = s.match(BIN_LABEL_RE)
    if (m) {
      const from = parseFloat(m[1])
      const to = parseFloat(m[2])
      if (!Number.isFinite(from) || !Number.isFinite(to)) return null
      centers.push((from + to) / 2)
      lefts.push(from)
      rights.push(to)
    } else {
      const n = typeof v === 'number' ? v : parseFloat(s)
      if (!Number.isFinite(n)) return null
      centers.push(n)
      lefts.push(n)
      rights.push(n)
    }
  }
  return { centers, dataMin: Math.min(...lefts), dataMax: Math.max(...rights) }
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

  const parsed = tryParseNumericPositions(origX)
  let xMin: number
  let xMax: number
  let tickvals: number[]
  let kdeOptions: { xMin: number; xMax: number; xPositions?: number[] }

  if (parsed && parsed.centers.length === numCategories) {
    // Axis and curve both span the full data range (first bin's left edge to last bin's
    // right edge), not just the kernel-center range.
    xMin = parsed.dataMin
    xMax = parsed.dataMax
    if (xMin === xMax) {
      xMin -= 0.5
      xMax += 0.5
    }
    tickvals = parsed.centers
    kdeOptions = { xMin, xMax, xPositions: parsed.centers }
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
