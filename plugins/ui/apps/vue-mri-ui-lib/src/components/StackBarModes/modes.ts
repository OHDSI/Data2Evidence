import { meta as StackedMeta, apply as applyStacked } from './StackedMode.vue'
import { meta as OverlayMeta, apply as applyOverlay } from './OverlayMode.vue'
import { meta as PartialOverlaySolidMeta, apply as applyPartialOverlaySolid } from './PartialOverlaySolidMode.vue'
import { meta as DistributionCurvesMeta, apply as applyDistributionCurves } from './KernelDensityPlotMode.vue'

export type ModeMeta = {
  id: string
  label: string
  labelKey: string
  hasDistributionOverlay: boolean
}

export type ModeApplyCtx = {
  showDistributionOverlay: boolean
  barGap: number
  colorway: string[]
}

export type ModeApply = (traces: any[], layout: any, ctx: ModeApplyCtx) => { traces: any[]; layout: any }

export const modeOrder: ModeMeta[] = [StackedMeta, OverlayMeta, PartialOverlaySolidMeta, DistributionCurvesMeta]

export const applyById: Record<string, ModeApply> = {
  [StackedMeta.id]: applyStacked,
  [OverlayMeta.id]: applyOverlay,
  [PartialOverlaySolidMeta.id]: applyPartialOverlaySolid,
  [DistributionCurvesMeta.id]: applyDistributionCurves,
}
