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
  | { conceptSetId: string; includeDescendants?: boolean; displayValue?: string }

export type PatchOp =
  | { op: 'add_card'; cardConfigPath: string; exclude?: boolean; ref?: string }
  | { op: 'add_constraint'; card: string; attributePath: string; value: ConstraintValue; operator?: string }
  | { op: 'remove_card'; card: string }
  | { op: 'remove_constraint'; card: string; attributePath: string }

export interface ApplyCohortPatchResult {
  applied: boolean
  createdCards: string[]
  error?: string
}

const isConceptSetValue = (v: any): v is { conceptSetId: string; includeDescendants?: boolean; displayValue?: string } =>
  !!v && typeof v === 'object' && typeof v.conceptSetId === 'string'

// Rollback bookkeeping: created cards are deleted, prior constraint values restored.
interface Rollback {
  createdCardIds: string[]
  priorConstraintValues: Array<{ constraintId: string; value: any }>
  createdConstraints: Array<{ filterCardId: string; constraintId: string }>
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
  const rollback: Rollback = { createdCardIds: [], priorConstraintValues: [], createdConstraints: [] }

  const resolveCard = (card: string): string => {
    const id = refMap.get(card) ?? card
    const cards = store.getters.getFilterCards?.() ?? {}
    if (!cards[id]) {
      throw new Error(`Unknown card "${card}". Create it with add_card or pass a real filterCardId.`)
    }
    return id
  }

  await dispatch('holdFireRequest')
  try {
    for (const rawOp of patchOps) {
      await applyOne(dispatch, store, rawOp, refMap, rollback, resolveCard)
    }
  } catch (err) {
    await revert(dispatch, rollback)
    await dispatch('releaseFireRequest')
    throw err instanceof Error ? err : new Error(String(err))
  }

  await dispatch('releaseFireRequest')
  await dispatch('setFireRequest')
  await dispatch('refreshPatientCount')
  return { applied: true, createdCards: [...rollback.createdCardIds] }
}

async function applyOne(
  dispatch: (a: string, p?: unknown) => Promise<any>,
  store: Store<any>,
  op: PatchOp,
  refMap: Map<string, string>,
  rollback: Rollback,
  resolveCard: (card: string) => string
): Promise<void> {
  switch (op.op) {
    case 'add_card': {
      const filterCardId = (await dispatch('addFilterCard', {
        configPath: op.cardConfigPath,
        isExclusion: op.exclude ?? false,
      })) as string
      rollback.createdCardIds.push(filterCardId)
      if (op.ref) refMap.set(op.ref, filterCardId)
      return
    }
    case 'add_constraint': {
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
// created during this patch. Best-effort — individual failures are swallowed so
// one bad undo can't mask the original error.
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
}
