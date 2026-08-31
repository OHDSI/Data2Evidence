import { modeOrder } from '../components/StackBarModes/modes'

export const STACKED_MODE_ID = 'stack'

/** A menu entry emitted by the bar-display-mode dropdown. */
export type ChartTypeMenuSelection =
  | {
      id?: string
      toggleOverlay?: boolean
      [key: string]: unknown
    }
  | null
  | undefined

export type ChartTypeApplication = {
  kind: 'apply'
  modeId: string
  resetOverlay: boolean
}

export type ChartTypeChangeState = {
  colorAxisIndex: number | null
  showDistributionOverlay: boolean
}

export type ChartTypeChangePlan =
  | { kind: 'ignore' }
  | { kind: 'warn'; apply: ChartTypeApplication }
  | ChartTypeApplication

export function planChartTypeChange(
  selection: ChartTypeMenuSelection,
  state: ChartTypeChangeState
): ChartTypeChangePlan {
  if (!selection || selection.toggleOverlay || !selection.id) return { kind: 'ignore' }

  const target = modeOrder.find(mode => mode.id === selection.id)
  const application: ChartTypeApplication = {
    kind: 'apply',
    modeId: selection.id,
    resetOverlay: state.showDistributionOverlay && !target?.hasDistributionOverlay,
  }

  // Switching away from the stacked bar chart clears the "Colour by" (color axis) selection,
  // which is only supported on the stacked bar chart. Warn before discarding it.
  if (selection.id !== STACKED_MODE_ID && state.colorAxisIndex !== null) {
    return { kind: 'warn', apply: application }
  }

  return application
}
