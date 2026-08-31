import { describe, expect, it } from 'vitest'
import { planChartTypeChange } from '../chartTypeChange'

const withColorAxis = { colorAxisIndex: 1, showDistributionOverlay: false }
const withoutColorAxis = { colorAxisIndex: null, showDistributionOverlay: false }

describe('planChartTypeChange', () => {
  it('ignores a menu click that carries no payload', () => {
    expect(planChartTypeChange(null, withoutColorAxis)).toEqual({ kind: 'ignore' })
  })

  it('ignores the distribution-overlay toggle item', () => {
    expect(planChartTypeChange({ toggleOverlay: true }, withoutColorAxis)).toEqual({ kind: 'ignore' })
  })

  it('ignores a payload without a mode id', () => {
    expect(planChartTypeChange({ someOtherField: true }, withoutColorAxis)).toEqual({ kind: 'ignore' })
  })

  it('applies the new mode immediately when no colour axis is selected', () => {
    expect(planChartTypeChange({ id: 'overlay' }, withoutColorAxis)).toEqual({
      kind: 'apply',
      modeId: 'overlay',
      resetOverlay: false,
    })
  })

  it('warns instead of applying when a colour axis would be discarded', () => {
    expect(planChartTypeChange({ id: 'overlay' }, withColorAxis)).toEqual({
      kind: 'warn',
      apply: { kind: 'apply', modeId: 'overlay', resetOverlay: false },
    })
  })

  it('does not warn when re-selecting the stacked bar chart, which keeps the colour axis', () => {
    expect(planChartTypeChange({ id: 'stack' }, withColorAxis)).toEqual({
      kind: 'apply',
      modeId: 'stack',
      resetOverlay: false,
    })
  })

  it('clears the distribution overlay when the target mode cannot show one', () => {
    expect(
      planChartTypeChange({ id: 'distribution' }, { colorAxisIndex: null, showDistributionOverlay: true })
    ).toEqual({ kind: 'apply', modeId: 'distribution', resetOverlay: true })
  })

  it('keeps the distribution overlay when the target mode supports one', () => {
    expect(planChartTypeChange({ id: 'overlay' }, { colorAxisIndex: null, showDistributionOverlay: true })).toEqual({
      kind: 'apply',
      modeId: 'overlay',
      resetOverlay: false,
    })
  })

  it('carries the overlay reset through the warning, so confirming applies it', () => {
    expect(planChartTypeChange({ id: 'distribution' }, { colorAxisIndex: 0, showDistributionOverlay: true })).toEqual({
      kind: 'warn',
      apply: { kind: 'apply', modeId: 'distribution', resetOverlay: true },
    })
  })
})
