type KDEOptions = {
  numPoints?: number
  xMin?: number
  xMax?: number
}

type KDEResult = {
  xGrid: number[]
  perTrace: Array<{ scaledDensity: number[] } | null>
}

const gaussian = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)

export function computeKDE(traces: Array<{ y?: Array<number | string> }>, options: KDEOptions = {}): KDEResult {
  const firstY = traces[0]?.y || []
  const numCategories = firstY.length
  const xMin = options.xMin ?? -0.5
  const xMax = options.xMax ?? numCategories - 0.5
  const numPoints = options.numPoints ?? Math.max(200, numCategories * 20)

  const step = numPoints > 1 ? (xMax - xMin) / (numPoints - 1) : 0
  const xGrid = Array.from({ length: numPoints }, (_, i) => xMin + i * step)

  const perTrace = traces.map(trace => {
    const yVals = (trace.y || []).map(Number)
    const totalWeight = yVals.reduce((s, v) => s + v, 0)
    if (totalWeight === 0) return null

    const wMean = yVals.reduce((s, v, idx) => s + v * idx, 0) / totalWeight
    const wVariance = yVals.reduce((s, v, idx) => s + v * (idx - wMean) ** 2, 0) / totalWeight
    const stdDev = Math.sqrt(wVariance) || 1
    const bandwidth = 1.06 * stdDev * Math.pow(totalWeight, -0.2)

    const density = xGrid.map(x => {
      let sum = 0
      yVals.forEach((weight, idx) => {
        sum += weight * gaussian((x - idx) / bandwidth)
      })
      return sum / (totalWeight * bandwidth)
    })

    const maxDensity = Math.max(...density)
    const maxY = Math.max(...yVals)
    const scale = maxDensity > 0 ? maxY / maxDensity : 1
    const scaledDensity = density.map(d => d * scale)

    return { scaledDensity }
  })

  return { xGrid, perTrace }
}

/**
 * Append distribution-curve scatter traces on a secondary x-axis (xaxis2)
 * overlaying the existing bars. Mutates both `traces` and `layout`.
 */
export function appendDistributionOverlay(traces: any[], layout: any, colorway: string[]) {
  const originalTraces = traces.filter(t => t.showlegend !== false)
  const numCategories = originalTraces[0]?.y?.length || 0
  if (numCategories <= 1) return

  const xMin = -0.5
  const xMax = numCategories - 0.5
  const { xGrid, perTrace } = computeKDE(originalTraces, { xMin, xMax })

  originalTraces.forEach((trace, i) => {
    const kde = perTrace[i]
    if (!kde) return
    traces.push({
      x: xGrid,
      y: kde.scaledDensity,
      type: 'scatter',
      mode: 'lines',
      line: {
        color: colorway[i % colorway.length],
        width: 2,
      },
      xaxis: 'x2',
      showlegend: false,
      hoverinfo: 'skip',
    })
  })

  layout.xaxis2 = {
    overlaying: 'x',
    range: [xMin, xMax],
    showgrid: false,
    showticklabels: false,
    zeroline: false,
    visible: false,
    anchor: 'y',
    autorange: false,
  }
  layout.xaxis.autorange = true
  layout.xaxis.constrain = 'domain'
  layout.yaxis.rangemode = 'nonnegative'
}
