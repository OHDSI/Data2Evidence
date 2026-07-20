import d3 from 'd3'
import Canvg from 'canvg'
import Constants from './Constants'

interface IKmLegendInput {
  logRank: string
  pValue: string
  title: string
  data: any
  overlapCanvas?: boolean
}

interface IBarLegendItem {
  color: string
  name: string
  kind: 'bar' | 'curve'
  opacity: number
  borderColor: string
}

const BAR_LEGEND_BOX_SIZE = 12
const BAR_LEGEND_ITEM_MARGIN = 4
const BAR_LEGEND_ITEM_HEIGHT = BAR_LEGEND_BOX_SIZE + BAR_LEGEND_ITEM_MARGIN
const BAR_LEGEND_PADDING = 12
const BAR_LEGEND_BOX_TEXT_GAP = 8
const BAR_LEGEND_TEXT_COLOR = '#000080'
const BAR_LEGEND_FONT = '12px Arial'
const BAR_LEGEND_DEFAULT_COLOR = '#cccccc'
const BAR_LEGEND_DEFAULT_BORDER = 'transparent'
const BAR_LEGEND_WRAP_CHARS = 40

const X_AXIS_TITLE_FONT = '13px Arial'
const X_AXIS_TITLE_COLOR = '#000080'
const X_AXIS_TITLE_BAND_HEIGHT = 26

// Slanted (rotated) x-axis tick labels overflow the plot area to the right and below;
// Plotly clips that overflow at the SVG edge, cutting off the last/longest label in the
// export. These paddings (in native SVG px) extend the viewBox on the right and bottom so
// the full rotated labels are captured. Expressed in the same units as the live chart, so
// they read as a fixed amount of breathing room regardless of the export target size.
const CHART_EXPORT_PAD_RIGHT = 48
const CHART_EXPORT_PAD_BOTTOM = 24

/**
 * Builds the combined x-axis title shown beneath a bar/column chart, in the
 * form "{x2}/{x1}". Plotly does not render an x-axis title for these charts, so
 * the axis attribute names are drawn manually at export time.
 *
 * The backend returns x-axis categories in slot order (index 0 = x1, index 1 =
 * x2); they are reversed here so the secondary (outer) axis precedes the primary
 * one, matching the top-to-bottom order of the nested axis labels.
 */
export const buildXAxisTitle = (categories: any[]): string => {
  if (!Array.isArray(categories)) return ''
  const names = categories
    .filter(c => c && c.axis === Constants.AxisId.X && c.id !== 'dummy_category')
    .map(c => c.name)
    .filter(Boolean)
  if (names.length === 0) return ''
  return [...names].reverse().join('/')
}

/**
 * Returns a new canvas identical to `chartCanvas` with `title` drawn centred in
 * a band directly beneath it.
 */
const appendXAxisTitle = (chartCanvas: HTMLCanvasElement, title: string): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = chartCanvas.width
  canvas.height = chartCanvas.height + X_AXIS_TITLE_BAND_HEIGHT

  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(chartCanvas, 0, 0)

  ctx.font = X_AXIS_TITLE_FONT
  ctx.fillStyle = X_AXIS_TITLE_COLOR
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, chartCanvas.width / 2, chartCanvas.height + X_AXIS_TITLE_BAND_HEIGHT / 2)

  return canvas
}

/**
 * Reads the rendered StackBarChartLegend entries from the DOM.
 * The legend component is an HTML div outside the chart SVG so it must be
 * captured separately at export time.
 */
const readStackBarLegendFromDOM = (): IBarLegendItem[] => {
  const container = document.querySelector('.stackbar-legend-container')
  if (!container) return []

  const items: IBarLegendItem[] = []
  container.querySelectorAll('.stackbar-legend-entry').forEach((entry: Element) => {
    const box = entry.querySelector('.stackbar-legend-entry-box') as HTMLElement | null
    const line = entry.querySelector('.stackbar-legend-entry-line') as HTMLElement | null
    const textEl = entry.querySelector('.stackbar-legend-entry-text')
    // Prefer the untruncated full name (the visible text may be shortened with an ellipsis).
    const fullName = (entry as HTMLElement).getAttribute('data-full-name')?.trim()
    const name = fullName || textEl?.textContent?.trim() || ''
    if (!name) return

    let color = BAR_LEGEND_DEFAULT_COLOR
    let kind: 'bar' | 'curve' = 'bar'
    let opacity = 1
    let borderColor = BAR_LEGEND_DEFAULT_BORDER

    const targetEl = box || line
    if (targetEl) {
      const style = window.getComputedStyle(targetEl)
      color = style.backgroundColor || BAR_LEGEND_DEFAULT_COLOR
      opacity = parseFloat(style.opacity || '1')
      const hasBorder = style.borderTopStyle !== 'none' && parseFloat(style.borderTopWidth || '0') > 0
      borderColor = hasBorder ? style.borderTopColor || BAR_LEGEND_DEFAULT_BORDER : BAR_LEGEND_DEFAULT_BORDER
      kind = box ? 'bar' : 'curve'
    }

    items.push({ color, name, kind, opacity, borderColor })
  })
  return items
}

/**
 * Creates a canvas containing the bar/column chart legend (coloured swatches + names).
 */
const createBarLegendCanvas = (items: IBarLegendItem[]): HTMLCanvasElement => {
  // Wrap long names onto multiple lines so the full text is shown (never truncated).
  const wrappedItems = items.map(item => ({
    ...item,
    lines: wrapTextByChars(item.name, BAR_LEGEND_WRAP_CHARS),
  }))

  // Measure text widths to size the canvas correctly.
  const tmpCanvas = document.createElement('canvas')
  const tmpCtx = tmpCanvas.getContext('2d')!
  tmpCtx.font = BAR_LEGEND_FONT
  const maxTextWidth = wrappedItems.reduce(
    (m, item) => item.lines.reduce((lineMax, line) => Math.max(lineMax, tmpCtx.measureText(line).width), m),
    0
  )
  const totalLines = wrappedItems.reduce((n, item) => n + item.lines.length, 0)

  const canvasWidth = Math.ceil(BAR_LEGEND_PADDING * 2 + BAR_LEGEND_BOX_SIZE + BAR_LEGEND_BOX_TEXT_GAP + maxTextWidth)
  const canvasHeight = Math.ceil(BAR_LEGEND_PADDING * 2 + totalLines * BAR_LEGEND_ITEM_HEIGHT - BAR_LEGEND_ITEM_MARGIN)

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.font = BAR_LEGEND_FONT

  let y = BAR_LEGEND_PADDING
  wrappedItems.forEach(item => {
    // Swatch is drawn once, aligned with the first line of the entry.
    ctx.save()
    ctx.globalAlpha = item.opacity

    if (item.kind === 'bar') {
      ctx.fillStyle = item.color
      ctx.fillRect(BAR_LEGEND_PADDING, y, BAR_LEGEND_BOX_SIZE, BAR_LEGEND_BOX_SIZE)

      if (item.borderColor !== BAR_LEGEND_DEFAULT_BORDER) {
        ctx.strokeStyle = item.borderColor
        ctx.lineWidth = 1
        ctx.strokeRect(BAR_LEGEND_PADDING + 0.5, y + 0.5, BAR_LEGEND_BOX_SIZE - 1, BAR_LEGEND_BOX_SIZE - 1)
      }
    } else {
      // Distribution curve: thin horizontal line centred vertically.
      ctx.fillStyle = item.color
      ctx.fillRect(BAR_LEGEND_PADDING, y + Math.floor(BAR_LEGEND_BOX_SIZE / 2) - 1, BAR_LEGEND_BOX_SIZE, 2)
    }
    ctx.restore()

    ctx.fillStyle = BAR_LEGEND_TEXT_COLOR
    item.lines.forEach((line, li) => {
      ctx.fillText(
        line,
        BAR_LEGEND_PADDING + BAR_LEGEND_BOX_SIZE + BAR_LEGEND_BOX_TEXT_GAP,
        y + li * BAR_LEGEND_ITEM_HEIGHT + BAR_LEGEND_BOX_SIZE - 1
      )
    })

    y += item.lines.length * BAR_LEGEND_ITEM_HEIGHT
  })

  return canvas
}

const duplicateStyle = (element, style, km: boolean) => {
  const colorConstOpacity = Constants.PDFColorConstOpacity

  element.style.fill = style.fill
  if (style.fill === 'rgba(0,0,0,0)') {
    element.style.fill = 'transparent'
  }
  element.style.stroke = style.stroke
  element.style.strokeStyle = style.strokeStyle
  element.style.display = style.display
  element.style['stroke-width'] = style['stroke-width'] ? '1px' : ''
  element.style['font-size'] = style['font-size']
  element.style['font-family'] = style['font-family']
  element.style['font-weight'] = style['font-weight']
  element.style['fill-opacity'] = style['fill-opacity']
  element.style['stroke-opacity'] = style['stroke-opacity']
  element.style.opacity = style.opacity
  element.style['text-anchor'] = style['text-anchor']

  if (km) {
    let colorString
    for (let col = 0; col < colorConstOpacity.length; col += 1) {
      colorString = `rgb(${colorConstOpacity[col].originR}, ${colorConstOpacity[col].originG}, ${colorConstOpacity[col].originB})`
      if (style.stroke === colorString && style.opacity && style.opacity < 1) {
        element.style.stroke = `rgb(${colorConstOpacity[col].newR}, ${colorConstOpacity[col].newG}, ${colorConstOpacity[col].newB})`
      }
    }
  }
}

const svgApplyCSS = (svgOrigin: any, svgElement: any, km = false) => {
  if (svgElement.nodeType !== 1) {
    return
  }
  if (svgElement.childNodes && svgElement.childNodes.length > 0) {
    for (let i = 0; i < svgElement.childNodes.length; i += 1) {
      svgApplyCSS(svgOrigin.childNodes[i], svgElement.childNodes[i], km)
    }
  }
  duplicateStyle(svgElement, window.getComputedStyle(svgOrigin as Element), km)
}

export const canvasWrapper = (ctx, text, maxWidth) => {
  const words = text.split(' ')
  const lines = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i += 1) {
    const word = words[i]
    const width = ctx.measureText(`${currentLine} ${word}`).width
    if (width < maxWidth) {
      currentLine += ` ${word}`
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  lines.push(currentLine)
  return lines
}

/**
 * Wraps `text` onto multiple lines so no line exceeds `maxChars` characters.
 * Breaks on spaces where possible; a single word longer than `maxChars` is
 * hard-broken so it never overflows the line.
 */
export const wrapTextByChars = (text: string, maxChars: number): string[] => {
  if (!text) return ['']
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    // Hard-break a single word that is longer than the limit on its own.
    if (word.length > maxChars) {
      if (currentLine) {
        lines.push(currentLine)
        currentLine = ''
      }
      let remaining = word
      while (remaining.length > maxChars) {
        lines.push(remaining.slice(0, maxChars))
        remaining = remaining.slice(maxChars)
      }
      currentLine = remaining
      continue
    }

    const candidate = currentLine ? `${currentLine} ${word}` : word
    if (candidate.length > maxChars) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = candidate
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines.length ? lines : ['']
}

const cropCanvas = (canvas, width, height, y = 0, x = 0) => {
  const croppedCanvas = document.createElement('canvas')
  croppedCanvas.width = width
  croppedCanvas.height = height

  const context = croppedCanvas.getContext('2d')
  context.drawImage(canvas, y, x, canvas.width, canvas.height)
  return croppedCanvas
}

const combineCanvas = (canvasA: HTMLCanvasElement, canvasB: HTMLCanvasElement, overlap = false): HTMLCanvasElement => {
  const combinedCanvas = document.createElement('canvas')
  combinedCanvas.height = Math.max(canvasA.height, canvasB.height)
  combinedCanvas.width = overlap ? canvasA.width : canvasA.width + canvasB.width

  const combinedContext = combinedCanvas.getContext('2d')
  combinedContext.fillStyle = '#ffffff'
  combinedContext.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height)

  const canvasList = [
    {
      canvas: canvasA,
      x: 0,
      width: canvasA.width,
      height: canvasA.height,
    },
    {
      canvas: canvasB,
      x: overlap ? canvasA.width - canvasB.width : canvasA.width,
      width: canvasB.width,
      height: canvasB.height,
    },
  ]
  canvasList.forEach(n => {
    combinedContext.beginPath()
    combinedContext.drawImage(n.canvas, n.x, 0, n.width, n.height)
  })

  return combinedCanvas
}

export const createKmLegendCanvas = (pdfConst: any, kmLegendInput: IKmLegendInput) => {
  const mm = pdfConst.mm
  const kmLegendRowHeight = pdfConst.kmLegendBox + pdfConst.kmLegendMargin

  const tmpLegendCanvas = document.createElement('canvas')
  tmpLegendCanvas.height = pdfConst.kmLegendMaxHeight
  tmpLegendCanvas.width = pdfConst.kmLegendWidth * mm

  const ctx = tmpLegendCanvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, pdfConst.kmLegendWidth * mm, tmpLegendCanvas.height)

  let baseY = pdfConst.kmLegendMargin

  ctx.fillStyle = pdfConst.kmLegendColor
  ctx.font = pdfConst.kmLegendFont
  ctx.fillText(kmLegendInput.logRank, 0, baseY + pdfConst.kmLegendBox)

  baseY += kmLegendRowHeight
  const pValue = kmLegendInput.pValue
  ctx.fillText(pValue, 0, baseY + pdfConst.kmLegendBox)

  baseY += kmLegendRowHeight

  ctx.fillStyle = pdfConst.kmLegendColor
  ctx.font = `bold ${pdfConst.kmLegendFont}`

  const kmTitle = kmLegendInput.title

  let wrappedText = canvasWrapper(ctx, kmTitle, pdfConst.kmLegendWidth * mm - kmLegendRowHeight)

  for (let i = 0; i < wrappedText.length; i += 1) {
    if (i > 0) {
      baseY += pdfConst.kmLegendBox
    }
    ctx.fillText(wrappedText[i], 0, baseY + pdfConst.kmLegendBox)
  }
  ctx.font = pdfConst.kmLegendFont

  const kmLegendData = kmLegendInput.data
  for (let i = 0; i < kmLegendData.length; i += 1) {
    const legendData = kmLegendData[i]
    const legendText = legendData.name
    const legendColor = legendData.mColor

    baseY += kmLegendRowHeight
    wrappedText = canvasWrapper(ctx, legendText, pdfConst.kmLegendWidth * mm - kmLegendRowHeight)

    ctx.fillStyle = legendColor
    ctx.fillRect(0, baseY, pdfConst.kmLegendBox, pdfConst.kmLegendBox)
    ctx.fillStyle = pdfConst.kmLegendColor
    ctx.font = pdfConst.kmLegendFont

    for (let ii = 0; ii < wrappedText.length; ii += 1) {
      if (ii > 0) {
        baseY += pdfConst.kmLegendBox
      }
      ctx.fillText(wrappedText[ii], kmLegendRowHeight, baseY + pdfConst.kmLegendBox - pdfConst.kmLegendTextMargin)
    }
  }

  return cropCanvas(tmpLegendCanvas, tmpLegendCanvas.width, baseY + kmLegendRowHeight)
}

/**
 * CSS selectors for Plotly UI-only elements that must never be rasterised into an export:
 *  - draglayer   transparent mouse-event rects (canvg renders their fill as an opaque overlay)
 *  - modebar-*   toolbar buttons, including the custom "Reset view" button
 *  - select-outline  active selection rectangle
 */
export const INTERACTIVE_SELECTORS = [
  '.draglayer',
  '.modebar-container',
  '.modebar',
  '.modebar-group',
  '.modebar-btn',
  '.select-outline',
]

/**
 * Removes every interactive/UI-only child that matches INTERACTIVE_SELECTORS from `root`.
 * Safe to call on axis-title subtrees: none of the selectors match g-xtitle / g-ytitle.
 */
export const stripInteractiveSVG = (root: Element): void => {
  INTERACTIVE_SELECTORS.forEach(sel => root.querySelectorAll(sel).forEach(el => el.parentNode?.removeChild(el)))
}

export const createChartCanvas = (
  chartId: string,
  chartType: string,
  targetHeight: number,
  targetWidth: number,
  pdfConst: any,
  kmLegendInput?: IKmLegendInput,
  xAxisTitle?: string
): HTMLCanvasElement => {
  const svgItem = d3.select(chartId).select('svg')[0][0] as SVGSVGElement
  const svgClone = svgItem.cloneNode(true) as SVGSVGElement
  const serializer = new XMLSerializer()

  const isKm = chartType.includes('km')
  const isBarChart = chartType.includes('stacked') || chartType.includes('column')
  const isBoxplot = chartType.includes('boxplot')

  // Use the SVG's actual rendered pixel dimensions as the viewBox so canvg scales the
  // chart correctly when rendering to the (possibly larger) export canvas.
  // getBoundingClientRect gives the true pixel size even for responsive SVGs that use
  // width="100%" / height="100%" — for those, width.baseVal.value would return 100 (the
  // percentage) rather than the real pixel width, causing everything to appear shifted.
  const svgRect = svgItem.getBoundingClientRect()
  const svgNativeW = Math.round(svgRect.width) || targetWidth
  const svgNativeH = Math.round(svgRect.height) || targetHeight

  //Size the canvas to the scaled chart to reduce excessive margin
  let renderWidth = targetWidth
  let renderHeight = targetHeight
  // Extend the exported area for bar/column charts so slanted x-axis tick labels that
  // overflow the plot to the right/bottom are not clipped (see CHART_EXPORT_PAD_* above).
  let viewBoxWidth = svgNativeW
  let viewBoxHeight = svgNativeH
  if (isBarChart) {
    viewBoxWidth = svgNativeW + CHART_EXPORT_PAD_RIGHT
    viewBoxHeight = svgNativeH + CHART_EXPORT_PAD_BOTTOM
    const scale = Math.min(targetWidth / viewBoxWidth, targetHeight / viewBoxHeight)
    renderWidth = Math.round(viewBoxWidth * scale)
    renderHeight = Math.round(viewBoxHeight * scale)
  }

  svgClone.setAttribute('width', renderWidth.toString())
  svgClone.setAttribute('height', renderHeight.toString())
  svgClone.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)

  if (isKm) {
    svgClone.setAttribute('class', 'MriPaKaplan')
    svgApplyCSS(svgItem, svgClone, true)
  } else if (isBarChart) {
    svgApplyCSS(svgItem, svgClone)
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bgRect.style.width = '100%'
    bgRect.style.height = '100%'
    bgRect.style.fill = 'white'
    svgClone.prepend(bgRect)
  } else if (isBoxplot) {
    svgApplyCSS(svgItem, svgClone)
    svgClone.childNodes[0].style.fill = '#ffffff'
  }

  stripInteractiveSVG(svgClone)

  // Plotly renders axis titles (ytitle, xtitle) in the "infolayer" group which lives in a
  // SECOND <svg> element layered on top of the main chart SVG. d3.select().select('svg')
  // only captures the first SVG, so merge in the infolayer group to keep the axis titles.
  const plotlyContainer = document.querySelector(chartId) as HTMLElement
  if (plotlyContainer) {
    const infolayerEl = plotlyContainer.querySelector('.infolayer')
    if (infolayerEl && infolayerEl.closest('svg') !== svgItem) {
      const infolayerClone = infolayerEl.cloneNode(true) as Element
      svgApplyCSS(infolayerEl, infolayerClone)
      // Remove any toolbar nodes that ride along in the same layer without touching the
      // axis-title groups, then append so the axis titles remain in the export.
      stripInteractiveSVG(infolayerClone)
      svgClone.appendChild(infolayerClone)
    }
  }

  const chartCanvas = document.createElement('canvas')
  chartCanvas.height = renderHeight
  chartCanvas.width = renderWidth

  let svgStr = serializer.serializeToString(svgClone)

  if (isKm) {
    // Manually Move X-Axis Legends for KM
    const xAxisLocation = `translate(${Math.floor(targetWidth)}`
    const xAxisNewLocation = `translate(${Math.floor(targetWidth) - pdfConst.kmLegendWidth}`
    svgStr = svgStr.replace(xAxisLocation, xAxisNewLocation)
  }

  // Call canvg to draw the chart on the canvas
  const ctx = chartCanvas.getContext('2d')
  const v = Canvg.fromString(ctx, svgStr)
  v.start()

  let outputCanvas = chartCanvas
  if (isKm && kmLegendInput) {
    const legendCanvas = createKmLegendCanvas(pdfConst, kmLegendInput)
    outputCanvas = combineCanvas(chartCanvas, legendCanvas, kmLegendInput.overlapCanvas)
  } else if (isBarChart) {
    if (xAxisTitle) {
      outputCanvas = appendXAxisTitle(outputCanvas, xAxisTitle)
    }
    const barLegendItems = readStackBarLegendFromDOM()
    if (barLegendItems.length > 0) {
      const legendCanvas = createBarLegendCanvas(barLegendItems)
      outputCanvas = combineCanvas(outputCanvas, legendCanvas)
    }
  }

  return outputCanvas
}
