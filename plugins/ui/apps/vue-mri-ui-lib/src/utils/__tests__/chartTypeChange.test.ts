import { describe, expect, it } from 'vitest'
import { planChartTypeChange } from '../chartTypeChange'

const fromStacked = { currentModeId: 'stack', showDistributionOverlay: false }
const fromOverlay = { currentModeId: 'overlay', showDistributionOverlay: false }

describe('planChartTypeChange', () => {
  it('ignores a menu click that carries no payload', () => {
    expect(planChartTypeChange(null, fromStacked)).toEqual({ kind: 'ignore' })
  })

  it('ignores the distribution-overlay toggle item', () => {
    expect(planChartTypeChange({ toggleOverlay: true }, fromStacked)).toEqual({ kind: 'ignore' })
  })

  it('ignores a payload without a mode id', () => {
    expect(planChartTypeChange({ someOtherField: true }, fromStacked)).toEqual({ kind: 'ignore' })
  })

  it('warns when leaving the stacked bar chart, even with no colour axis selected', () => {
    expect(planChartTypeChange({ id: 'overlay' }, fromStacked)).toEqual({
      kind: 'warn',
      apply: { kind: 'apply', modeId: 'overlay', resetOverlay: false },
    })
  })

  it('warns for every chart type reached from the stacked bar chart', () => {
    for (const id of ['overlay', 'partialOverlaySolid', 'distribution']) {
      expect(planChartTypeChange({ id }, fromStacked).kind).toBe('warn')
    }
  })

  it('does not warn when re-selecting the stacked bar chart', () => {
    expect(planChartTypeChange({ id: 'stack' }, fromStacked)).toEqual({
      kind: 'apply',
      modeId: 'stack',
      resetOverlay: false,
    })
  })

  it('does not warn when switching between two non-stacked chart types', () => {
    expect(planChartTypeChange({ id: 'distribution' }, fromOverlay)).toEqual({
      kind: 'apply',
      modeId: 'distribution',
      resetOverlay: false,
    })
  })

  it('does not warn when switching back to the stacked bar chart', () => {
    expect(planChartTypeChange({ id: 'stack' }, fromOverlay)).toEqual({
      kind: 'apply',
      modeId: 'stack',
      resetOverlay: false,
    })
  })

  it('clears the distribution overlay when the target mode cannot show one', () => {
    expect(
      planChartTypeChange({ id: 'distribution' }, { currentModeId: 'overlay', showDistributionOverlay: true })
    ).toEqual({ kind: 'apply', modeId: 'distribution', resetOverlay: true })
  })

  it('keeps the distribution overlay when the target mode supports one', () => {
    expect(
      planChartTypeChange({ id: 'overlay' }, { currentModeId: 'distribution', showDistributionOverlay: true })
    ).toEqual({ kind: 'apply', modeId: 'overlay', resetOverlay: false })
  })

  it('carries the overlay reset through the warning, so confirming applies it', () => {
    expect(
      planChartTypeChange({ id: 'distribution' }, { currentModeId: 'stack', showDistributionOverlay: true })
    ).toEqual({
      kind: 'warn',
      apply: { kind: 'apply', modeId: 'distribution', resetOverlay: true },
    })
  })
})
