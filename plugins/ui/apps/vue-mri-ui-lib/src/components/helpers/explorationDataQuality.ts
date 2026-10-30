/**
 * Pure decisions behind the exploration card's Data quality action (#3119).
 *
 * These live outside `ExplorationsPage.vue` so they can be tested without
 * mounting anything, which the repository's testing policy asks for. Same
 * shape as `explorationAnalyze.ts`, which the Analyze action uses.
 */
import { isFlowRunInProgress } from '../../utils/FlowRunState'

/** The parts of an exploration record this action reads. */
export interface DataQualityCardSource {
  cohortDefinition?: { id?: unknown } | null
}

/**
 * The cohort definition to report on, or `null` when the card has none.
 *
 * DQD runs against a **cohort definition**, not against the exploration
 * record. An exploration that has never been materialised has no
 * `cohortDefinition`, so there is nothing to report on and the action is
 * disabled rather than hidden — hiding it would change the quick-action bar's
 * width from card to card.
 *
 * A bookmark id and an Atlas id are deliberately **not** accepted. They come
 * from different tables, they can collide with a cohort-definition id, and the
 * `/jobplugins/dqd/data-quality/cohort/:id/flow-run/latest` endpoint keys on
 * the cohort definition — passing either of the others would silently address
 * a different cohort's run rather than fail.
 *
 * The id is normalised to a string because it reaches the endpoint as a path
 * segment, and the backend hands it back as a number for D2E records and a
 * string for Atlas ones.
 */
export function dataQualityCohortId(card: DataQualityCardSource | null | undefined): string | null {
  const id = card?.cohortDefinition?.id
  if (typeof id === 'number') return Number.isFinite(id) ? String(id) : null
  if (typeof id === 'string') return id.length > 0 ? id : null
  return null
}

/** Whether the Data quality action can be opened for this card. */
export function canOpenDataQuality(card: DataQualityCardSource | null | undefined): boolean {
  return dataQualityCohortId(card) !== null
}

/** The dialog's two tabs, which are also the plugin's two views. */
export type DataQualityTab = 'dashboard' | 'checks'

export interface DataQualityParcelInput {
  datasetId: string
  cohortDefinitionId: string
  itemId: DataQualityTab
  locale: string
  getToken: () => Promise<string>
}

/**
 * The full prop bundle for the Atlas data-quality parcel.
 *
 * single-spa's `parcel.update` **replaces** a parcel's props rather than merging
 * them, so a partial update would drop `itemId`, `surface` and `locale`. Mount
 * and every update therefore send this whole object.
 *
 * `uiFilesUrl` is deliberately absent. It is the plugin's routed-mode
 * discriminator, and in routed mode it subscribes to `custom-props-changed`,
 * which Atlas broadcasts to every app on a source change - an open dialog
 * would silently swap dataset. useAtlasParcel injects the CSS instead.
 */
export function buildDataQualityParcelProps(input: DataQualityParcelInput): Record<string, unknown> {
  return {
    // Parcel-mode contract (the plugin's src/types.ts). resolveSourceKey reads
    // hostContext.sourceKey first and falls back to datasetId, so both are
    // sent: the nested one is the contract, the flat one is the safety net.
    hostContext: {
      surface: 'mri-exploration-card',
      itemId: input.itemId,
      locale: input.locale,
      permissions: [],
      sourceKey: input.datasetId,
      cohortDefinitionId: input.cohortDefinitionId,
    },
    datasetId: input.datasetId,
    getToken: input.getToken,
    locale: input.locale,
  }
}

/**
 * Where the exploration card's Data quality action stands for one cohort.
 * `checking`, `starting` and `running` are busy: the button is disabled and
 * shows a spinner.
 */
export type DataQualityPhase = 'idle' | 'checking' | 'starting' | 'running' | 'ready' | 'failed'

/** What a Prefect `state.type` means for the card. */
export type FlowRunGroup = 'running' | 'failed' | 'completed' | 'cancelled'

/**
 * Groups a flow run's `state.type` (jobplugins src/const.ts). The in-progress
 * states are utils/FlowRunState's, plus CANCELLING, which still ends in a state
 * worth waiting for.
 *
 * A missing or unknown state reads as failed, so the next click starts a fresh
 * run rather than waiting on a run whose outcome cannot be read.
 */
export function classifyFlowRunState(type: string | undefined | null): FlowRunGroup {
  if (type === 'COMPLETED') return 'completed'
  if (type === 'CANCELLED') return 'cancelled'
  if (type && (type === 'CANCELLING' || isFlowRunInProgress({ state: { type } }))) return 'running'
  return 'failed'
}

export function isDataQualityBusy(phase: DataQualityPhase): boolean {
  return phase === 'checking' || phase === 'starting' || phase === 'running'
}

/** The button tooltip's i18n key. An exploration with no cohort cannot run at all. */
export function dataQualityTooltipKey(phase: DataQualityPhase, hasCohort: boolean): string {
  if (!hasCohort) return 'MRI_PA_DATA_QUALITY_DISABLED_NOT_MATERIALISED'
  if (isDataQualityBusy(phase)) return 'MRI_PA_DATA_QUALITY_TOOLTIP_RUNNING'
  if (phase === 'ready') return 'MRI_PA_DATA_QUALITY_TOOLTIP_READY'
  if (phase === 'failed') return 'MRI_PA_DATA_QUALITY_TOOLTIP_FAILED'
  return 'MRI_PA_DATA_QUALITY_TOOLTIP_GENERATE'
}
