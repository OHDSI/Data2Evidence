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
    const name = textEl?.textContent?.trim() || ''
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
      borderColor = style.borderTopColor || BAR_LEGEND_DEFAULT_BORDER // Using borderTopColor to capture the solid border if present
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
  // Measure text widths to size the canvas correctly.
  const tmpCanvas = document.createElement('canvas')
  const tmpCtx = tmpCanvas.getContext('2d')!
  tmpCtx.font = BAR_LEGEND_FONT
  const maxTextWidth = items.reduce((m, item) => Math.max(m, tmpCtx.measureText(item.name).width), 0)

  const canvasWidth = Math.ceil(BAR_LEGEND_PADDING * 2 + BAR_LEGEND_BOX_SIZE + BAR_LEGEND_BOX_TEXT_GAP + maxTextWidth)
  const canvasHeight = Math.ceil(
    BAR_LEGEND_PADDING * 2 + items.length * BAR_LEGEND_ITEM_HEIGHT - BAR_LEGEND_ITEM_MARGIN
  )

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.font = BAR_LEGEND_FONT

  items.forEach((item, i) => {
    const y = BAR_LEGEND_PADDING + i * BAR_LEGEND_ITEM_HEIGHT

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
    ctx.fillText(
      item.name,
      BAR_LEGEND_PADDING + BAR_LEGEND_BOX_SIZE + BAR_LEGEND_BOX_TEXT_GAP,
      y + BAR_LEGEND_BOX_SIZE - 1
    )
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
  INTERACTIVE_SELECTORS.forEach(sel =>
    root.querySelectorAll(sel).forEach(el => el.parentNode?.removeChild(el))
  )
}

export const createChartCanvas = (
  chartId: string,
  chartType: string,
  targetHeight: number,
  targetWidth: number,
  pdfConst: any,
  kmLegendInput?: IKmLegendInput
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
  svgClone.setAttribute('width', targetWidth.toString())
  svgClone.setAttribute('height', targetHeight.toString())
  svgClone.setAttribute('viewBox', `0 0 ${svgNativeW} ${svgNativeH}`)

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
  chartCanvas.height = targetHeight
  chartCanvas.width = targetWidth

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
    const barLegendItems = readStackBarLegendFromDOM()
    if (barLegendItems.length > 0) {
      const legendCanvas = createBarLegendCanvas(barLegendItems)
      outputCanvas = combineCanvas(chartCanvas, legendCanvas)
    }
  }

  return outputCanvas
}
