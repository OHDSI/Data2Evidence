// Deterministic cohort patch applier for the WebMCP `pa_apply_cohort_patch` tool.
//
// The LLM emits typed *intent* (PatchOp[]) — never a hand-built bookmark tree —
// and this applier mutates the IFR already in the Vuex store via the app's own
// query actions. That reuses the exact validation/normalization the UI uses, so
// AI-driven edits behave identically to wizard-driven ones. See
// DESIGN_pa_apply_cohort_patch.md and CLAUDE.md ("Never author bookmark JSON").
import type { Store } from 'vuex'
import { getFieldAttrKey } from '../utils/dashboardFlowUtils'
import { applyConstraintValue } from '../utils/applyConstraintValue'

export type ConstraintValue =
  | number
  | string
  | { from?: string; to?: string }
  // conceptSetId may arrive as a number — d2e-mcp create_concept_set returns numeric ids.
  | { conceptSetId: string | number; includeDescendants?: boolean; displayValue?: string }

export type PatchOp =
  | { op: 'add_card'; cardConfigPath: string; exclude?: boolean; ref?: string; orWith?: string }
  | { op: 'add_constraint'; card: string; attributePath: string; value: ConstraintValue; operator?: string }
  | { op: 'remove_card'; card: string }
  | { op: 'remove_constraint'; card: string; attributePath: string }
  | { op: 'set_card_join'; card: string; join: 'AND' | 'OR' }

/** One OR-group of filter cards. Groups are AND-ed with each other. */
export interface CardGroup {
  cards: Array<{ filterCardId: string; name: string; exclude?: boolean }>
}

export interface ApplyCohortPatchResult {
  applied: boolean
  createdCards: string[]
  /**
   * What each add_constraint actually put on the cohort, read back from the store.
   * The caller is an LLM that has to report the filters it applied — give it the
   * committed state to report rather than its own intent.
   */
  appliedConstraints?: Array<{ card: string; attributePath: string; value: any }>
  /** The resulting AND/OR structure: cards within a group are OR-ed, groups AND-ed. */
  cardGroups?: CardGroup[]
  error?: string
}

// A concept-set value is any object carrying a conceptSetId. Accept string OR number:
// d2e-mcp returns numeric concept-set ids, and a number that slips through to the
// generic text path gets String()'d into "[object Object]" (a broken filter → count "--").
const isConceptSetValue = (
  v: any
): v is { conceptSetId: string | number; includeDescendants?: boolean; displayValue?: string } =>
  !!v && typeof v === 'object' && (typeof v.conceptSetId === 'string' || typeof v.conceptSetId === 'number')

// Rollback bookkeeping: created cards are deleted, prior constraint values and
// the chart's axis selection restored, grouping changes undone.
interface Rollback {
  createdCardIds: string[]
  priorConstraintValues: Array<{ constraintId: string; value: any; dates?: { from: any; to: any } }>
  createdConstraints: Array<{ filterCardId: string; constraintId: string }>
  priorAxes: AxisSnapshot[]
  /**
   * Grouping (AND/OR) changes, newest last. Undone by applying the inverse
   * toggle — the same pair of store actions the AND/OR buttons use — because the
   * container ids change as containers are merged/split, so a recorded id would
   * be stale by the time revert runs. `card` is the card the toggle acted on;
   * finding its container again at revert time is what makes the inverse exact.
   */
  joinChanges: Array<{ card: string; undo: 'split' | 'merge' }>
}

interface AxisSnapshot {
  id: number
  props: { attributeId: string; filterCardId: string; key: string; binsize?: any }
}

// The store's deleteFilterCard clears every axis bound to the card id it is given,
// so a rolled-back add_card takes the chart's axis selection with it. An axis-less
// cohort is not a cosmetic problem: the bar-chart query then goes out with an empty
// axisSelection and analytics-svc generates `MeasurePopulation AS (SELECT  FROM …)`,
// which the DB rejects ("SELECT clause without selection list") — the cohort renders
// "--" for every later edit until the builder is reset. Snapshot before, restore after.
const snapshotAxes = (store: Store<any>): AxisSnapshot[] =>
  ((store.getters.getAllAxes as any[]) ?? []).map((axis, id) => ({
    id,
    props: {
      attributeId: axis?.props?.attributeId ?? '',
      filterCardId: axis?.props?.filterCardId ?? '',
      key: axis?.props?.key ?? '',
      ...(typeof axis?.props?.binsize === 'undefined' ? {} : { binsize: axis.props.binsize }),
    },
  }))

// ---------------------------------------------------------------------------
// AND / OR grouping
//
// There is no "operator" field on a filter card. The builder expresses the
// boolean structure through the SHAPE of the tree (see getIFR in
// store/modules/query.ts): the cards inside one boolFilterContainer become
// `BooleanContainers.Or(cards)`, and the containers themselves become
// `BooleanContainers.And(containers)`. So:
//
//   same container   → OR   ("had Alzheimer's OR had sinusitis")
//   separate containers → AND ("had Alzheimer's AND had sinusitis")
//
// `addFilterCard` with no boolFilterContainerId always opens a NEW container,
// which is why an unqualified add_card is always an AND. To OR two cards they
// must share a container — that is what add_card's `orWith` and `set_card_join`
// do, via the same store actions the AND/OR buttons in the UI dispatch.
// ---------------------------------------------------------------------------

/** The Basic Data card's instance id is its config path (see createFilterCard). */
const BASIC_DATA_CARD = 'patient'

interface CardLocation {
  containerId: string
  /** Position of the container among the root container's children. */
  containerIndex: number
  /** Position of the card within its container (0 = first, i.e. no OR before it). */
  indexInContainer: number
  cards: string[]
}

const containerIdsOf = (store: Store<any>): string[] => {
  const rootId = store.getters.getBoolContainerRoot?.()
  return store.getters.getBoolContainer?.(rootId)?.props?.boolfiltercontainers ?? []
}

const cardsInContainer = (store: Store<any>, containerId: string): string[] =>
  store.getters.getBoolFilterContainer?.(containerId)?.props?.filterCards ?? []

function locateCard(store: Store<any>, filterCardId: string): CardLocation | undefined {
  const containerIds = containerIdsOf(store)
  for (let containerIndex = 0; containerIndex < containerIds.length; containerIndex += 1) {
    const containerId = containerIds[containerIndex]
    const cards = cardsInContainer(store, containerId)
    const indexInContainer = cards.indexOf(filterCardId)
    if (indexInContainer > -1) {
      return { containerId, containerIndex, indexInContainer, cards }
    }
  }
  return undefined
}

const isExclusionCard = (store: Store<any>, filterCardId: string): boolean =>
  !!store.getters.getFilterCard?.(filterCardId)?.props?.excludeFilter

/**
 * The container a merge would fold into — the store's own rule: the nearest
 * PRECEDING container of the same inclusion/exclusion kind
 * (toggleFilterContainerBooleanCondition). Undefined when there is none.
 */
function previousContainerFor(store: Store<any>, loc: CardLocation): { id: string; cards: string[] } | undefined {
  const containerIds = containerIdsOf(store)
  const wantsExclusion = loc.cards.some(id => isExclusionCard(store, id))
  for (let i = loc.containerIndex - 1; i >= 0; i -= 1) {
    const cards = cardsInContainer(store, containerIds[i])
    if (cards.some(id => isExclusionCard(store, id)) === wantsExclusion) {
      return { id: containerIds[i], cards }
    }
  }
  return undefined
}

/**
 * Guard the one grouping that is always wrong: OR-ing anything with Basic Data.
 * Basic Data holds the demographics every cohort starts from, so
 * `Or(patient, conditionOccurrence)` matches every patient the demographics
 * alone match — the filter silently stops filtering. The UI can't express it
 * either (BoolFilterContainer hides the 'patient' card from the OR list).
 */
function assertNotBasicData(cards: string[], what: string): void {
  if (cards.includes(BASIC_DATA_CARD)) {
    throw new Error(
      `${what} would OR it with the Basic Data card, which matches every patient the demographics match — ` +
        'the filter would stop filtering. OR interaction cards (Condition Occurrence, Drug Exposure, …) with ' +
        'each other; demographics stay on Basic Data, which is always AND-ed with the rest.'
    )
  }
}

// ---------------------------------------------------------------------------
// Concept-set domain check
//
// Every `conceptSet` attribute is configured with the OMOP domain its concepts
// must come from (`domainFilter`: "Condition", "Visit", "Drug", …) — that is what
// the UI's concept-set picker filters the vocabulary by. A set built for one
// domain matches nothing in another, so the same concept-set id cannot be
// correct on two attributes whose domains differ.
//
// The failure this closes: asked to widen a cohort to "Alzheimer's OR an ER
// visit", the model added the Visit card correctly and then filled its concept
// set with the ALZHEIMER'S set it already had in context — it never resolved
// "ER visit" at all. The cohort still computes, so nothing looks broken; it just
// answers a different question. Same-domain reuse stays legal (the same
// Condition set on a primary- and a secondary-diagnosis card is a real cohort).
// ---------------------------------------------------------------------------

function attributeDomain(store: Store<any>, attributePath: string): string {
  try {
    return store.getters.getMriFrontendConfig?.getAttributeByPath?.(attributePath)?.getDomainFilter?.() ?? ''
  } catch {
    // A path the config doesn't know is add_constraint's problem to report, not
    // this check's — an unknown domain simply skips the comparison.
    return ''
  }
}

/** Every place this concept-set id is already filtered on, with that attribute's domain. */
function conceptSetUses(
  store: Store<any>,
  conceptSetId: string
): Array<{ card: string; attributePath: string; domain: string }> {
  const uses: Array<{ card: string; attributePath: string; domain: string }> = []
  for (const cardId of Object.keys(store.getters.getFilterCards?.() ?? {})) {
    const constraints: any[] = store.getters.getFilterCardConstraints?.(cardId) ?? []
    for (const constraint of constraints) {
      if (constraint?.props?.type !== 'conceptSet') continue
      const values: any[] = Array.isArray(constraint.props.value) ? constraint.props.value : []
      if (!values.some(v => String(v?.value) === conceptSetId)) continue
      const attributePath = constraint.props.attributePath
      uses.push({ card: cardId, attributePath, domain: attributeDomain(store, attributePath) })
    }
  }
  return uses
}

function assertConceptSetDomain(store: Store<any>, op: AddConstraintOp, conceptSetId: string): void {
  const targetDomain = attributeDomain(store, op.attributePath)
  if (!targetDomain) return
  const conflict = conceptSetUses(store, conceptSetId).find(use => use.domain && use.domain !== targetDomain)
  if (!conflict) return
  throw new Error(
    `Concept set ${conceptSetId} is already filtered on "${conflict.attributePath}" (card "${conflict.card}"), ` +
      `whose concepts are ${conflict.domain}-domain, but "${op.attributePath}" takes ${targetDomain}-domain ` +
      `concepts — one concept set cannot be both, so this would filter on the wrong term and match nothing. ` +
      `Resolve what the user asked for on THIS card into its own value: list_concept_sets / search_concepts for ` +
      `a ${targetDomain} concept set, or pa_search_attribute_values for a catalog attribute on this card. ` +
      'Never carry a concept-set id over from a different filter.'
  )
}

type AddConstraintOp = Extract<PatchOp, { op: 'add_constraint' }>

// Fields that carry a constraint value but are only meaningful INSIDE `value`.
// Seeing one at the top level of the op is the tell for the mistake below.
const MISPLACED_VALUE_KEYS = ['conceptSetId', 'conceptSetIds', 'conceptId', 'conceptIds', 'from', 'to', 'values']

const VALUE_SHAPE_HELP =
  'Pass value: <number|string> for a basic attribute, { from, to } for a date range, or ' +
  '{ conceptSetId, includeDescendants? } for a conceptSet attribute. ' +
  'To clear a filter use remove_constraint, not an empty value.'

/**
 * Reject an add_constraint that carries nothing to set.
 *
 * This is the single most dangerous op shape in the applier: applyConstraintValue
 * reads an empty value on a text/conceptSet attribute as "clear this filter", so
 * the patch reports success and leaves a filter card with no constraint — the
 * cohort then silently keeps every patient the filter was supposed to exclude.
 * That is a clinical error dressed as a working cohort, so fail loudly instead.
 */
function assertHasValue(op: AddConstraintOp): void {
  const v: any = op.value
  const isEmpty =
    typeof v === 'undefined' ||
    v === null ||
    (typeof v === 'string' && v.trim() === '') ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)
  if (!isEmpty) return

  const misplaced = MISPLACED_VALUE_KEYS.filter(k => k in (op as any))
  throw new Error(
    `add_constraint for "${op.attributePath}" has no value. ` +
      (misplaced.length
        ? `Found ${misplaced.join(', ')} at the top level of the op — ${
            misplaced.length > 1 ? 'they belong' : 'it belongs'
          } inside \`value\`. `
        : '') +
      VALUE_SHAPE_HELP
  )
}

/**
 * Post-condition for add_constraint: the value is really on the constraint now.
 *
 * The input check above catches the shapes we know about; this catches the rest.
 * Any normalization that quietly resolves to "no value" must fail the patch rather
 * than leave an empty filter behind and report success.
 */
function assertValueLanded(store: Store<any>, filterCardId: string, key: string, op: AddConstraintOp): any {
  const props = store.getters.getConstraintForAttribute?.({ filterCardId, key })?.props
  // Date constraints live in fromDate/toDate, everything else in a value array.
  if (Array.isArray(props?.value) && props.value.length > 0) {
    return props.value
  }
  if (typeof props?.fromDate?.value !== 'undefined' || typeof props?.toDate?.value !== 'undefined') {
    return { from: props?.fromDate?.value, to: props?.toDate?.value }
  }
  throw new Error(
    `Constraint for "${op.attributePath}" ended up empty after applying ${JSON.stringify(op.value)}. ` +
      VALUE_SHAPE_HELP
  )
}

/**
 * Apply a list of typed patch ops to the live cohort in `store`. Atomic: if any
 * op fails the whole patch is rolled back and the error is rethrown.
 */
export async function applyCohortPatch(store: Store<any>, patchOps: PatchOp[]): Promise<ApplyCohortPatchResult> {
  if (!Array.isArray(patchOps) || patchOps.length === 0) {
    throw new Error('patchOps must be a non-empty array')
  }
  const dispatch = (action: string, payload?: unknown) => store.dispatch(action, payload)

  // ref (local handle from add_card) -> real filterCardId, so later ops can
  // target a card created earlier in the same patch.
  const refMap = new Map<string, string>()
  const rollback: Rollback = {
    createdCardIds: [],
    priorConstraintValues: [],
    createdConstraints: [],
    priorAxes: snapshotAxes(store),
    joinChanges: [],
  }

  const resolveCard = (card: string): string => {
    const id = refMap.get(card) ?? card
    const cards = store.getters.getFilterCards?.() ?? {}
    if (!cards[id]) {
      throw new Error(`Unknown card "${card}". Create it with add_card or pass a real filterCardId.`)
    }
    return id
  }

  const appliedConstraints: NonNullable<ApplyCohortPatchResult['appliedConstraints']> = []

  await dispatch('holdFireRequest')
  try {
    for (const rawOp of patchOps) {
      await applyOne(dispatch, store, rawOp, refMap, rollback, resolveCard, appliedConstraints)
    }
  } catch (err) {
    await revert(dispatch, rollback, store)
    await dispatch('releaseFireRequest')
    throw err instanceof Error ? err : new Error(String(err))
  }

  // Grouping cards together runs the store's resetAxes, which clears every axis
  // bound to a card in a container that now holds more than one card. That is
  // fine when the user clicks the OR button (they can re-pick), but here it
  // would leave the cohort with an empty axisSelection — analytics-svc then
  // emits `SELECT  FROM …` and the DB rejects it, so the count reads "--".
  // Put back only the axes whose card still exists.
  await restoreClearedAxes(dispatch, store, rollback.priorAxes)

  await dispatch('releaseFireRequest')
  await dispatch('setFireRequest')
  await dispatch('refreshPatientCount')
  return {
    applied: true,
    createdCards: [...rollback.createdCardIds],
    appliedConstraints,
    cardGroups: describeCardGroups(store),
  }
}

/**
 * The current AND/OR structure, read back from the store after the patch.
 *
 * The caller is an LLM that has to tell the user what the cohort now means, and
 * "OR" is not visible anywhere in `appliedConstraints` — it lives in how the
 * cards are grouped. Reporting it here is also what lets a follow-up patch
 * target the right card without re-reading the whole cohort.
 */
export function describeCardGroups(store: Store<any>): CardGroup[] {
  return containerIdsOf(store)
    .map(containerId => ({
      // Cards within a group are OR-ed; the groups themselves are AND-ed.
      cards: cardsInContainer(store, containerId).map(id => ({
        filterCardId: id,
        name: store.getters.getFilterCard?.(id)?.props?.name ?? id,
        ...(isExclusionCard(store, id) ? { exclude: true } : {}),
      })),
    }))
    .filter(group => group.cards.length > 0)
}

async function restoreClearedAxes(
  dispatch: (a: string, p?: unknown) => Promise<any>,
  store: Store<any>,
  priorAxes: AxisSnapshot[]
): Promise<void> {
  const cards = store.getters.getFilterCards?.() ?? {}
  const current = snapshotAxes(store)
  for (const axis of priorAxes) {
    const stillBound = current[axis.id]?.props?.attributeId
    if (stillBound || !axis.props.attributeId || !cards[axis.props.filterCardId]) continue
    try {
      await dispatch('setAxisValue', { id: axis.id, props: axis.props })
    } catch (e) {
      console.error('[cohortPatch] restoring axis after grouping change failed', e)
    }
  }
}

async function applyOne(
  dispatch: (a: string, p?: unknown) => Promise<any>,
  store: Store<any>,
  op: PatchOp,
  refMap: Map<string, string>,
  rollback: Rollback,
  resolveCard: (card: string) => string,
  applied: NonNullable<ApplyCohortPatchResult['appliedConstraints']>
): Promise<void> {
  switch (op.op) {
    case 'add_card': {
      // Fail fast on a bad path with a recoverable message, instead of a generic
      // store error (or a silently-malformed card). Skip when config isn't loaded.
      const config = store.getters.getMriFrontendConfig
      if (config?.getFilterCards) {
        const validPaths: string[] = (config.getFilterCards() ?? []).map((c: any) => c.getConfigPath())
        if (!validPaths.includes(op.cardConfigPath)) {
          throw new Error(
            `Unknown cardConfigPath "${op.cardConfigPath}". Use pa_list_filter_options (or the ` +
              'validFilterOptions returned on this error) for the valid card paths.'
          )
        }
      }
      // Single-instance cards (Basic Data) must never be added twice. An indexed
      // card gets an instance id with a trailing number
      // ("…conditionoccurrence.1"), so a card whose instance id IS the config path
      // is the singleton — and the store would happily create a SECOND card under
      // that same id. The IFR then carries "patient" in two bool containers, so
      // every constraint on it is emitted twice (`age < 100 AND age < 100`) and
      // deleting either copy clears the chart axes bound to the id that survives.
      // A model that adds Basic Data before constraining Age/Gender is doing the
      // reasonable thing; reuse what is already there.
      const existing = store.getters.getFilterCards?.() ?? {}
      if (existing[op.cardConfigPath]) {
        if (op.ref) refMap.set(op.ref, op.cardConfigPath)
        return
      }
      // `orWith` puts the new card in the SAME bool container as an existing one,
      // which is how the builder represents OR. Without it the store opens a new
      // container and the card is AND-ed (the default, and the right one for
      // "sinusitis AND a drug exposure").
      let boolFilterContainerId: string | undefined
      if (op.orWith) {
        const target = resolveCard(op.orWith)
        assertNotBasicData([target], `add_card orWith:"${op.orWith}"`)
        const loc = locateCard(store, target)
        if (!loc) {
          throw new Error(
            `add_card orWith:"${op.orWith}" — card "${target}" is not in the cohort's filter tree, so there is ` +
              'no group to join. Pass the filterCardId of a card that is on the cohort, or an add_card `ref` ' +
              'created earlier in this same patch.'
          )
        }
        // Not just the target: joining its GROUP ORs the new card with every card
        // in it, so Basic Data sharing that group is the same silent widening.
        assertNotBasicData(loc.cards, `add_card orWith:"${op.orWith}"`)
        if ((op.exclude ?? false) !== isExclusionCard(store, target)) {
          throw new Error(
            `add_card orWith:"${op.orWith}" cannot OR an ${op.exclude ? 'exclusion' : 'inclusion'} card with an ` +
              `${op.exclude ? 'inclusion' : 'exclusion'} one — they are separate sections of the builder. ` +
              'OR cards of the same kind.'
          )
        }
        boolFilterContainerId = loc.containerId
      }
      const filterCardId = (await dispatch('addFilterCard', {
        configPath: op.cardConfigPath,
        isExclusion: op.exclude ?? false,
        ...(boolFilterContainerId ? { boolFilterContainerId } : {}),
      })) as string
      rollback.createdCardIds.push(filterCardId)
      if (op.ref) refMap.set(op.ref, filterCardId)
      return
    }
    case 'set_card_join': {
      // Change how a card ALREADY on the cohort combines with the card before it.
      // Both branches dispatch exactly what the AND/OR buttons dispatch, so an
      // AI-driven regroup and a click produce the same tree.
      const join = String((op as any).join ?? '').toUpperCase()
      if (join !== 'AND' && join !== 'OR') {
        throw new Error(`set_card_join: join must be "AND" or "OR" (got ${JSON.stringify((op as any).join)}).`)
      }
      const filterCardId = resolveCard(op.card)
      if (filterCardId === BASIC_DATA_CARD) {
        throw new Error(
          'set_card_join: the Basic Data card is always AND-ed with the rest of the cohort — its demographics ' +
            'apply to every patient the other cards match. Regroup the interaction cards instead.'
        )
      }
      const loc = locateCard(store, filterCardId)
      if (!loc) {
        throw new Error(`set_card_join: card "${op.card}" is not in the cohort's filter tree.`)
      }
      if (join === 'OR') {
        // Already OR-ed with the card before it in the same group: nothing to do.
        if (loc.indexInContainer > 0) return
        const prev = previousContainerFor(store, loc)
        if (!prev) {
          throw new Error(
            `set_card_join: "${filterCardId}" is the first filter card, so there is nothing before it to OR it ` +
              'with. Set the join on the LATER card of the pair.'
          )
        }
        assertNotBasicData(prev.cards, `set_card_join OR on "${filterCardId}"`)
        // Merges this card's container into the previous one → they share a
        // container → Or(...) in the IFR.
        await dispatch('toggleFilterContainerBooleanCondition', {
          filterContainerId: loc.containerId,
          parentId: store.getters.getBoolContainerRoot?.(),
        })
        rollback.joinChanges.push({ card: filterCardId, undo: 'split' })
        return
      }
      // AND: already the first card of its own group → already AND-ed.
      if (loc.indexInContainer === 0) return
      // Splits this card (and any card after it in the group) into a new
      // container → AND with what precedes it.
      await dispatch('toggleFilterBooleanCondition', { filterCardId, parentId: loc.containerId })
      rollback.joinChanges.push({ card: filterCardId, undo: 'merge' })
      return
    }
    case 'add_constraint': {
      assertHasValue(op)
      // Before anything is mutated: a concept set that belongs to another
      // domain is a wrong-cohort bug, not a rendering one.
      if (isConceptSetValue(op.value)) {
        assertConceptSetDomain(store, op, String(op.value.conceptSetId))
      }
      const filterCardId = resolveCard(op.card)
      const key = getFieldAttrKey(op.attributePath)
      let constraint = store.getters.getConstraintForAttribute?.({ filterCardId, key })
      if (constraint) {
        rollback.priorConstraintValues.push({
          constraintId: constraint.id,
          value: constraint.props?.value,
          // Snapshot the date slot too when the constraint has one — see Rollback.
          ...(constraint.props?.fromDate || constraint.props?.toDate
            ? { dates: { from: constraint.props?.fromDate?.value, to: constraint.props?.toDate?.value } }
            : {}),
        })
      } else {
        const constraintId = (await dispatch('addFilterCardConstraint', { filterCardId, key })) as string
        rollback.createdConstraints.push({ filterCardId, constraintId })
        constraint = store.getters.getConstraintForAttribute?.({ filterCardId, key })
      }
      if (!constraint) {
        throw new Error(`Could not create constraint for "${op.attributePath}" on card "${op.card}".`)
      }
      if (isConceptSetValue(op.value)) {
        await dispatch('updateConstraintValue', {
          constraintId: constraint.id,
          value: [
            {
              value: String(op.value.conceptSetId),
              text: op.value.displayValue ?? String(op.value.conceptSetId),
              display_value: op.value.displayValue ?? String(op.value.conceptSetId),
              includeDescendants: op.value.includeDescendants ?? false,
            },
          ],
        })
      } else {
        await applyConstraintValue(dispatch, constraint, op.value, op.operator ?? '=')
      }
      applied.push({
        card: filterCardId,
        attributePath: op.attributePath,
        value: assertValueLanded(store, filterCardId, key, op),
      })
      return
    }
    case 'remove_constraint': {
      const filterCardId = resolveCard(op.card)
      const key = getFieldAttrKey(op.attributePath)
      const constraint = store.getters.getConstraintForAttribute?.({ filterCardId, key })
      if (constraint) {
        await dispatch('deleteFilterCardConstraint', { filterCardId, constraintId: constraint.id })
      }
      return
    }
    case 'remove_card': {
      const filterCardId = resolveCard(op.card)
      await dispatch('deleteFilterCard', { filterCardId })
      return
    }
    default:
      throw new Error(`Unknown patch op: ${JSON.stringify((op as any).op)}`)
  }
}

// Undo a partially-applied patch, mirroring revertFieldChanges in
// useDashboardFlow: restore prior constraint values, drop constraints and cards
// created during this patch, and put the chart's axis selection back the way it
// was. Best-effort — individual failures are swallowed so one bad undo can't
// mask the original error.
async function revert(
  dispatch: (a: string, p?: unknown) => Promise<any>,
  rollback: Rollback,
  store: Store<any>
): Promise<void> {
  // Grouping first, while the cards this patch created are still present: a
  // merge/split is expressed in terms of a card's CURRENT container, so undoing
  // it after the card is gone would have nothing to locate.
  for (const { card, undo } of rollback.joinChanges.reverse()) {
    try {
      const loc = locateCard(store, card)
      if (!loc) continue
      if (undo === 'split' && loc.indexInContainer > 0) {
        await dispatch('toggleFilterBooleanCondition', { filterCardId: card, parentId: loc.containerId })
      } else if (undo === 'merge' && loc.indexInContainer === 0 && previousContainerFor(store, loc)) {
        await dispatch('toggleFilterContainerBooleanCondition', {
          filterContainerId: loc.containerId,
          parentId: store.getters.getBoolContainerRoot?.(),
        })
      }
    } catch (e) {
      console.error('[cohortPatch] revert join change failed', e)
    }
  }
  for (const { constraintId, value, dates } of rollback.priorConstraintValues.reverse()) {
    if (dates) {
      try {
        // isUTC:true is the pass-through branch of updateDateConstraintValue: the
        // snapshot is already normalized, and the only transform it applies there
        // (toUTCEndOfDay on a 'time' attribute) is idempotent on a Date and returns
        // '' — an unset constraint — untouched. The isUTC:false branch would shift
        // the range by the timezone offset every time it ran.
        await dispatch('updateDateConstraintValue', {
          constraintId,
          fromDateValue: dates.from,
          toDateValue: dates.to,
          isUTC: true,
        })
      } catch (e) {
        console.error('[cohortPatch] revert updateDateConstraintValue failed', e)
      }
    }
    if (typeof value !== 'undefined') {
      try {
        await dispatch('updateConstraintValue', { constraintId, value })
      } catch (e) {
        console.error('[cohortPatch] revert updateConstraintValue failed', e)
      }
    }
  }
  for (const { filterCardId, constraintId } of rollback.createdConstraints.reverse()) {
    try {
      await dispatch('deleteFilterCardConstraint', { filterCardId, constraintId })
    } catch (e) {
      console.error('[cohortPatch] revert deleteFilterCardConstraint failed', e)
    }
  }
  for (const filterCardId of rollback.createdCardIds.reverse()) {
    try {
      await dispatch('deleteFilterCard', { filterCardId })
    } catch (e) {
      console.error('[cohortPatch] revert deleteFilterCard failed', e)
    }
  }
  // Last: deleteFilterCard above cleared any axis pointing at a card it removed,
  // so the axis selection is restored after the cards, not before.
  for (const { id, props } of rollback.priorAxes) {
    try {
      await dispatch('setAxisValue', { id, props })
    } catch (e) {
      console.error('[cohortPatch] revert setAxisValue failed', e)
    }
  }
}
