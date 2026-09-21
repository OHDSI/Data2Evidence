/**
 * Pure decisions behind the exploration card's Data quality action (#3119).
 *
 * These live outside `ExplorationsPage.vue` so they can be tested without
 * mounting anything, which the repository's testing policy asks for. Same
 * shape as `explorationAnalyze.ts`, which the Analyze action uses.
 */

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
