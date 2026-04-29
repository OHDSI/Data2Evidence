import d3 from 'd3'
import Canvg from 'canvg'
import { max } from 'underscore'
import Constants from './Constants'

interface IKmLegendInput {
  logRank: string
  pValue: string
  title: string
  data: any
  overlapCanvas?: boolean
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
  element.style['fill-opacity'] = style['fill-opacity']
  element.style['stroke-opacity'] = style['stroke-opacity']
  element.style['text-anchor'] = style['text-anchor']
  element.style['font-weight'] = ''

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

const svgApplyCSS = (svgOrigin, svgElement, km = false) => {
  if (svgElement.childNodes && svgElement.childNodes.length > 0) {
    for (let i = 0; i < svgElement.childNodes.length; i += 1) {
      if (svgElement.nodeType === 1) {
        svgApplyCSS(svgOrigin.childNodes[i], svgElement.childNodes[i], km)
      }
    }
  }
  if (svgElement.nodeType === 1) {
    duplicateStyle(svgElement, window.getComputedStyle(svgOrigin), km)
  }
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
  combinedCanvas.height = max([canvasA.height, canvasB.height])
  combinedCanvas.width = overlap ? canvasA.width : canvasA.width + canvasB.width
  combinedCanvas.getContext('2d').fillStyle = '#ffffff'
  combinedCanvas.getContext('2d').fillRect(0, 0, combinedCanvas.width, combinedCanvas.height)
  const combinedContext = combinedCanvas.getContext('2d')

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
  tmpLegendCanvas.getContext('2d').fillStyle = '#ffffff'
  tmpLegendCanvas.getContext('2d').fillRect(0, 0, pdfConst.kmLegendWidth * mm, tmpLegendCanvas.height)

  let baseY = pdfConst.kmLegendMargin

  tmpLegendCanvas.getContext('2d').fillStyle = pdfConst.kmLegendColor
  tmpLegendCanvas.getContext('2d').font = pdfConst.kmLegendFont
  tmpLegendCanvas.getContext('2d').fillText(kmLegendInput.logRank, 0, baseY + pdfConst.kmLegendBox)

  baseY += kmLegendRowHeight
  const pValue = kmLegendInput.pValue
  tmpLegendCanvas.getContext('2d').fillText(pValue, 0, baseY + pdfConst.kmLegendBox)

  baseY += kmLegendRowHeight

  tmpLegendCanvas.getContext('2d').fillStyle = pdfConst.kmLegendColor
  tmpLegendCanvas.getContext('2d').font = `bold ${pdfConst.kmLegendFont}`

  const kmTitle = kmLegendInput.title

  let wrappedText = canvasWrapper(
    tmpLegendCanvas.getContext('2d'),
    kmTitle,
    pdfConst.kmLegendWidth * mm - kmLegendRowHeight
  )

  for (let i = 0; i < wrappedText.length; i += 1) {
    if (i > 0) {
      baseY += pdfConst.kmLegendBox
    }
    tmpLegendCanvas.getContext('2d').fillText(wrappedText[i], 0, baseY + pdfConst.kmLegendBox)
  }
  tmpLegendCanvas.getContext('2d').font = pdfConst.kmLegendFont

  const kmLegendData = kmLegendInput.data
  for (let i = 0; i < kmLegendData.length; i += 1) {
    const legendData = kmLegendData[i]
    const legendText = legendData.name
    const legendColor = legendData.mColor

    baseY += kmLegendRowHeight
    wrappedText = canvasWrapper(
      tmpLegendCanvas.getContext('2d'),
      legendText,
      pdfConst.kmLegendWidth * mm - kmLegendRowHeight
    )

    tmpLegendCanvas.getContext('2d').fillStyle = legendColor
    tmpLegendCanvas.getContext('2d').fillRect(0, baseY, pdfConst.kmLegendBox, pdfConst.kmLegendBox)
    tmpLegendCanvas.getContext('2d').fillStyle = pdfConst.kmLegendColor
    tmpLegendCanvas.getContext('2d').font = pdfConst.kmLegendFont

    for (let ii = 0; ii < wrappedText.length; ii += 1) {
      if (ii > 0) {
        baseY += pdfConst.kmLegendBox
      }
      tmpLegendCanvas
        .getContext('2d')
        .fillText(wrappedText[ii], kmLegendRowHeight, baseY + pdfConst.kmLegendBox - pdfConst.kmLegendTextMargin)
    }
  }

  return cropCanvas(tmpLegendCanvas, tmpLegendCanvas.width, baseY + kmLegendRowHeight)
}

export const createChartCanvas = (
  chartId: string,
  chartType: string,
  targetHeight: number,
  targetWidth: number,
  pdfConst: any,
  kmLegendInput?: IKmLegendInput
): HTMLCanvasElement => {
  const svgItem = d3.select(chartId).select('svg')[0][0]
  const svgClone = svgItem.cloneNode(true)
  const serializer = new XMLSerializer()

  if (chartType.indexOf('km') > -1) {
    svgClone.setAttribute('class', 'MriPaKaplan')
    svgApplyCSS(svgItem, svgClone, true)
  } else if (chartType.indexOf('stacked') > -1 || chartType.indexOf('column') > -1) {
    svgApplyCSS(svgItem, svgClone)
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bgRect.style.width = '100%'
    bgRect.style.height = '100%'
    bgRect.style.fill = 'white'
    svgClone.prepend(bgRect)
  } else if (chartType.indexOf('boxplot') > -1) {
    svgApplyCSS(svgItem, svgClone)
    svgClone.childNodes[0].style.fill = '#ffffff'
  }

  const chartCanvas = document.createElement('canvas')
  chartCanvas.height = targetHeight
  chartCanvas.width = targetWidth

  let svgStr = serializer.serializeToString(svgClone)

  if (chartType.indexOf('km') > -1) {
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
  if (chartType.indexOf('km') > -1 && kmLegendInput) {
    const legendCanvas = createKmLegendCanvas(pdfConst, kmLegendInput)
    outputCanvas = combineCanvas(chartCanvas, legendCanvas, kmLegendInput.overlapCanvas)
  }

  return outputCanvas
}
