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
  /** The chart type currently rendered, already resolved against the config flags. */
  currentModeId: string
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

  // Leaving the stacked bar chart discards the "Colour by" (color axis) selection and
  // retires the second X-axis; neither exists on the other chart types. Warn first.
  if (state.currentModeId === STACKED_MODE_ID && selection.id !== STACKED_MODE_ID) {
    return { kind: 'warn', apply: application }
  }

  return application
}
