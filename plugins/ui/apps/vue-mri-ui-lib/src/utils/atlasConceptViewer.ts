/**
 * Hands a concept off to the Atlas concept viewer when Patient Analytics runs
 * embedded in Atlas3.
 *
 * The iframe cannot navigate its host, so the hand-off is a postMessage that the
 * wrapper parcel (atlas-iframe-parcel.ts) turns into an Atlas route change.
 * Running standalone there is no host to hand off to, so every entry point here
 * reports whether it acted and the caller keeps its own behaviour when it did not.
 */

export const OPEN_CONCEPT_MESSAGE = 'pa-open-concept'

export interface OpenConceptMessage {
  type: typeof OPEN_CONCEPT_MESSAGE
  conceptId: number
  sourceKey: string
}

interface ConceptLike {
  concept_id?: unknown
  id?: unknown
  value?: unknown
}

/**
 * Atlas routes the viewer as /concept/:sourceKey/:conceptId(\d+), so only a
 * positive integer is usable. Tags carry the id under different keys depending
 * on whether they came from a concept set or a free concept selection.
 */
export const resolveConceptId = (item: ConceptLike | null | undefined): number | null => {
  if (!item) return null
  for (const candidate of [item.concept_id, item.id, item.value]) {
    const id = typeof candidate === 'string' ? Number(candidate) : candidate
    if (typeof id === 'number' && Number.isInteger(id) && id > 0) return id
  }
  return null
}

/**
 * The boot shim only publishes __MRI_PORTAL_CONTEXT__ on the iframe path, so its
 * presence alongside a distinct parent frame is what distinguishes embedded from
 * standalone.
 */
export const isEmbeddedInAtlas = (): boolean =>
  typeof window !== 'undefined' && window.parent !== window && !!(window as any).__MRI_PORTAL_CONTEXT__

/**
 * In d2e the Atlas source key is the dataset id, which the host already delivers
 * in pa-context, so no extra lookup is needed to build the route.
 */
const sourceKey = (): string => (window as any).__MRI_PORTAL_CONTEXT__?.datasetId || ''

/** Returns true when the hand-off was posted. */
export const openConceptInAtlas = (item: ConceptLike | null | undefined): boolean => {
  if (!isEmbeddedInAtlas()) return false

  const conceptId = resolveConceptId(item)
  if (conceptId === null) return false

  const key = sourceKey()
  if (!key) return false

  const message: OpenConceptMessage = { type: OPEN_CONCEPT_MESSAGE, conceptId, sourceKey: key }
  window.parent.postMessage(message, window.location.origin)
  return true
}
