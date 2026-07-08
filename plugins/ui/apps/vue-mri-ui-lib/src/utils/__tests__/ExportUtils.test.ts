import { describe, it, expect } from 'vitest'
import { INTERACTIVE_SELECTORS, stripInteractiveSVG } from '../ExportUtils'

const SVG_NS = 'http://www.w3.org/2000/svg'

function makeSvg(innerHTML: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement
  svg.innerHTML = innerHTML
  document.body.appendChild(svg)
  return svg
}

describe('stripInteractiveSVG', () => {
  it('removes .draglayer elements', () => {
    const svg = makeSvg('<g class="draglayer"><rect/></g><g class="plot"></g>')
    stripInteractiveSVG(svg)
    expect(svg.querySelector('.draglayer')).toBeNull()
    expect(svg.querySelector('.plot')).not.toBeNull()
  })

  it('removes all modebar-related elements', () => {
    const svg = makeSvg(`
      <g class="modebar-container">
        <g class="modebar">
          <g class="modebar-group">
            <a class="modebar-btn"><svg/></a>
          </g>
        </g>
      </g>
    `)
    stripInteractiveSVG(svg)
    for (const sel of ['.modebar-container', '.modebar', '.modebar-group', '.modebar-btn']) {
      expect(svg.querySelector(sel)).toBeNull()
    }
  })

  it('removes .select-outline elements', () => {
    const svg = makeSvg('<path class="select-outline"/><g class="barlayer"></g>')
    stripInteractiveSVG(svg)
    expect(svg.querySelector('.select-outline')).toBeNull()
    expect(svg.querySelector('.barlayer')).not.toBeNull()
  })

  it('preserves axis-title groups (.g-ytitle and .g-xtitle)', () => {
    const svg = makeSvg(`
      <g class="infolayer">
        <g class="g-ytitle"><text class="ytitle">Y Label</text></g>
        <g class="g-xtitle"><text class="xtitle">X Label</text></g>
        <g class="modebar-container"><a class="modebar-btn"/></g>
        <g class="draglayer"><rect/></g>
      </g>
    `)
    stripInteractiveSVG(svg)
    expect(svg.querySelector('.g-ytitle')).not.toBeNull()
    expect(svg.querySelector('.g-xtitle')).not.toBeNull()
    expect(svg.querySelector('.ytitle')?.textContent).toBe('Y Label')
    expect(svg.querySelector('.xtitle')?.textContent).toBe('X Label')
  })

  it('strips interactive elements while preserving axis titles in the same infolayer', () => {
    const svg = makeSvg(`
      <g class="infolayer">
        <g class="g-ytitle"><text class="ytitle">Revenue</text></g>
        <g class="modebar-container"><a class="modebar-btn"/></g>
        <g class="draglayer"><rect/></g>
      </g>
    `)
    stripInteractiveSVG(svg)
    expect(svg.querySelector('.modebar-container')).toBeNull()
    expect(svg.querySelector('.draglayer')).toBeNull()
    expect(svg.querySelector('.g-ytitle')).not.toBeNull()
  })

  it('is a no-op when no interactive elements are present', () => {
    const svg = makeSvg('<g class="barlayer"><rect/></g><g class="infolayer"><g class="g-ytitle"/></g>')
    const before = svg.innerHTML
    stripInteractiveSVG(svg)
    expect(svg.innerHTML).toBe(before)
  })

  it('exports INTERACTIVE_SELECTORS with the expected classes', () => {
    expect(INTERACTIVE_SELECTORS).toContain('.draglayer')
    expect(INTERACTIVE_SELECTORS).toContain('.modebar-container')
    expect(INTERACTIVE_SELECTORS).toContain('.modebar-btn')
    expect(INTERACTIVE_SELECTORS).toContain('.select-outline')
    // axis-title classes must NOT be in the selector list
    expect(INTERACTIVE_SELECTORS).not.toContain('.g-ytitle')
    expect(INTERACTIVE_SELECTORS).not.toContain('.g-xtitle')
    expect(INTERACTIVE_SELECTORS).not.toContain('.ytitle')
  })
})
