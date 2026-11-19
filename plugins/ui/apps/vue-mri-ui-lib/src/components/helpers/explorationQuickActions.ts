export const QUICK_ACTIONS = ['materialize', 'filterSummary', 'analyze', 'dataQuality'] as const

export type QuickAction = (typeof QUICK_ACTIONS)[number]

export interface QuickActionInput {
  canMaterialize: boolean
  canBeMaterialised: boolean
  canAnalyze: boolean
  showDataQuality: boolean
  cohortDefinitionId: string | null
  dataQualityBusy: boolean
}

export interface QuickActionStatus {
  visible: boolean
  disabled: boolean
}

export type QuickActionState = Record<QuickAction, QuickActionStatus>

export interface QuickActionMenuItem<Icon> {
  value: QuickAction
  label: string
  icon: Icon
  disabled: boolean
}

export function quickActionState(input: QuickActionInput): QuickActionState {
  return {
    materialize: { visible: true, disabled: !input.canMaterialize || !input.canBeMaterialised },
    filterSummary: { visible: true, disabled: false },
    analyze: { visible: true, disabled: !input.canAnalyze },
    dataQuality: {
      visible: input.showDataQuality,
      disabled: !input.cohortDefinitionId || input.dataQualityBusy,
    },
  }
}

export function quickActionMenuItems<Icon>(
  state: QuickActionState,
  labels: Record<QuickAction, string>,
  icons: Record<QuickAction, Icon>
): QuickActionMenuItem<Icon>[] {
  return QUICK_ACTIONS.filter(action => state[action].visible).map(action => ({
    value: action,
    label: labels[action],
    icon: icons[action],
    disabled: state[action].disabled,
  }))
}
