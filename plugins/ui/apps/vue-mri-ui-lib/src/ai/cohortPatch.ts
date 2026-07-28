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
  | { op: 'add_card'; cardConfigPath: string; exclude?: boolean; ref?: string }
  | { op: 'add_constraint'; card: string; attributePath: string; value: ConstraintValue; operator?: string }
  | { op: 'remove_card'; card: string }
  | { op: 'remove_constraint'; card: string; attributePath: string }

export interface ApplyCohortPatchResult {
  applied: boolean
  createdCards: string[]
  /**
   * What each add_constraint actually put on the cohort, read back from the store.
   * The caller is an LLM that has to report the filters it applied — give it the
   * committed state to report rather than its own intent.
   */
  appliedConstraints?: Array<{ card: string; attributePath: string; value: any }>
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
// the chart's axis selection restored.
interface Rollback {
  createdCardIds: string[]
  priorConstraintValues: Array<{ constraintId: string; value: any }>
  createdConstraints: Array<{ filterCardId: string; constraintId: string }>
  priorAxes: AxisSnapshot[]
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
    await revert(dispatch, rollback)
    await dispatch('releaseFireRequest')
    throw err instanceof Error ? err : new Error(String(err))
  }

  await dispatch('releaseFireRequest')
  await dispatch('setFireRequest')
  await dispatch('refreshPatientCount')
  return { applied: true, createdCards: [...rollback.createdCardIds], appliedConstraints }
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
      const filterCardId = (await dispatch('addFilterCard', {
        configPath: op.cardConfigPath,
        isExclusion: op.exclude ?? false,
      })) as string
      rollback.createdCardIds.push(filterCardId)
      if (op.ref) refMap.set(op.ref, filterCardId)
      return
    }
    case 'add_constraint': {
      assertHasValue(op)
      const filterCardId = resolveCard(op.card)
      const key = getFieldAttrKey(op.attributePath)
      let constraint = store.getters.getConstraintForAttribute?.({ filterCardId, key })
      if (constraint) {
        rollback.priorConstraintValues.push({ constraintId: constraint.id, value: constraint.props?.value })
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
async function revert(dispatch: (a: string, p?: unknown) => Promise<any>, rollback: Rollback): Promise<void> {
  for (const { constraintId, value } of rollback.priorConstraintValues.reverse()) {
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
