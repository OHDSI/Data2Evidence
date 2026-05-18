type KDEOptions = {
  numPoints?: number
  xMin?: number
  xMax?: number
  // Optional kernel centers in data space, one per category. When omitted, integer
  // indices [0..n-1] are used (legacy index-space behavior).
  xPositions?: number[]
}

type KDEResult = {
  xGrid: number[]
  perTrace: Array<{ density: number[]; scaledDensity: number[] } | null>
}

// Silverman's rule of thumb: bandwidth = 1.06 * stdDev * n^(-1/5)
const SILVERMAN_FACTOR = 1.06
const SILVERMAN_EXPONENT = -1 / 5
// Bars are centered on integer indices, so the index-space axis extends a half bin past each end.
const BAR_HALF_WIDTH = 0.5
// Grid resolution heuristic: enough points for a smooth curve without over-sampling tiny
// histograms, and capped so high-cardinality attributes (e.g. concept names with thousands
// of categories) can't push KDE evaluation into O(categories²) territory.
const MIN_GRID_POINTS = 200
const MAX_GRID_POINTS = 2000
const GRID_POINTS_PER_CATEGORY = 20

const gaussian = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)

export function computeKDE(traces: Array<{ y?: Array<number | string> }>, options: KDEOptions = {}): KDEResult {
  const firstY = traces[0]?.y || []
  const numCategories = firstY.length
  const positions =
    options.xPositions && options.xPositions.length === numCategories
      ? options.xPositions
      : Array.from({ length: numCategories }, (_, i) => i)
  const usingDataSpace = !!options.xPositions
  const defaultMin = usingDataSpace ? Math.min(...positions) : -BAR_HALF_WIDTH
  const defaultMax = usingDataSpace ? Math.max(...positions) : numCategories - BAR_HALF_WIDTH
  const xMin = options.xMin ?? defaultMin
  const xMax = options.xMax ?? defaultMax
  const numPoints =
    options.numPoints ?? Math.min(MAX_GRID_POINTS, Math.max(MIN_GRID_POINTS, numCategories * GRID_POINTS_PER_CATEGORY))

  // Average spacing between adjacent kernel centers — used as the std-dev fallback when all
  // weight sits in a single bin (variance = 0). For integer positions this is 1, matching the
  // previous behavior; for arbitrary positions it scales with the data.
  const positionSpacing =
    numCategories > 1 ? Math.abs(positions[numCategories - 1] - positions[0]) / (numCategories - 1) : 1

  const step = numPoints > 1 ? (xMax - xMin) / (numPoints - 1) : 0
  const xGrid = Array.from({ length: numPoints }, (_, i) => xMin + i * step)

  const perTrace = traces.map(trace => {
    const yVals = (trace.y || []).map(Number)
    const totalWeight = yVals.reduce((s, v) => s + v, 0)
    if (totalWeight === 0) return null

    const wMean = yVals.reduce((s, v, idx) => s + v * positions[idx], 0) / totalWeight
    const wVariance = yVals.reduce((s, v, idx) => s + v * (positions[idx] - wMean) ** 2, 0) / totalWeight
    const rawStdDev = Math.sqrt(wVariance)
    const stdDev = rawStdDev > 0 ? rawStdDev : positionSpacing
    // Silverman's rule alone shrinks the bandwidth as N grows, which for grouped/binned data
    // can drop below the bin spacing and produce a bumpy curve with a visible lump at every
    // non-empty bin. Floor the bandwidth at the bin spacing so adjacent kernels always overlap.
    const silvermanBandwidth = SILVERMAN_FACTOR * stdDev * Math.pow(totalWeight, SILVERMAN_EXPONENT)
    const bandwidth = Math.max(silvermanBandwidth, positionSpacing)

    const density = xGrid.map(x => {
      let sum = 0
      yVals.forEach((weight, idx) => {
        sum += weight * gaussian((x - positions[idx]) / bandwidth)
      })
      return sum / (totalWeight * bandwidth)
    })

    const maxDensity = Math.max(...density)
    const maxY = Math.max(...yVals)
    const scale = maxDensity > 0 ? maxY / maxDensity : 1
    const scaledDensity = density.map(d => d * scale)

    return { density, scaledDensity }
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

  const xMin = -BAR_HALF_WIDTH
  const xMax = numCategories - BAR_HALF_WIDTH
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
