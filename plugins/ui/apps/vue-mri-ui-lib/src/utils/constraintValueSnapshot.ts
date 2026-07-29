import type { ConstraintDispatch } from './applyConstraintValue'

/**
 * A constraint's value as it stood before an edit, so the edit can be undone.
 *
 * TWO slots, not one: a date/time constraint carries no `props.value` at all —
 * its state lives in `props.fromDate.value` / `props.toDate.value` (see
 * DateConstraintModel and CONSTRAINTS_DATETIME_SET_VALUE) — so bookkeeping that
 * snapshots only `value` records `undefined` for a date range and then restores
 * nothing. That is how a widened date window survived a failed edit while the
 * user was told nothing had been applied.
 *
 * Shared by the WebMCP cohort-patch applier and the dashboard wizard flow, which
 * both have to unwind a partially-applied set of constraint edits — the same
 * reason applyConstraintValue is shared.
 */
export interface ConstraintValueSnapshot {
  constraintId: string
  value: any
  /** Present only for a constraint that keeps a date range. */
  dates?: { from: any; to: any }
}

/** Record a constraint's current value so restoreConstraintValue can put it back. */
export function snapshotConstraintValue(constraint: any): ConstraintValueSnapshot {
  const props = constraint?.props
  return {
    constraintId: constraint?.id,
    value: props?.value,
    ...(props?.fromDate || props?.toDate ? { dates: { from: props?.fromDate?.value, to: props?.toDate?.value } } : {}),
  }
}

/**
 * Put a snapshot back on its constraint (or on `constraintId`'s replacement, if
 * the caller re-created the constraint and passes the new id).
 *
 * Best-effort: each slot is restored independently and a failure is logged rather
 * than thrown, because the caller is already unwinding a failed edit and one bad
 * undo must not mask the error that started it.
 */
export async function restoreConstraintValue(
  dispatch: ConstraintDispatch,
  { constraintId, value, dates }: ConstraintValueSnapshot
): Promise<void> {
  if (dates) {
    try {
      // isUTC:true is the pass-through branch of updateDateConstraintValue: the
      // snapshot is already normalized, and the only transform that branch applies
      // (toUTCEndOfDay on a 'time' attribute) is idempotent on a Date and leaves ''
      // — an unset constraint — untouched. The isUTC:false branch would shift the
      // range by the timezone offset on every restore.
      await dispatch('updateDateConstraintValue', {
        constraintId,
        fromDateValue: dates.from,
        toDateValue: dates.to,
        isUTC: true,
      })
    } catch (e) {
      console.error('[constraintValueSnapshot] restoring the date range failed', e)
    }
  }
  // `undefined` means the constraint never had a value slot (a date-only
  // constraint), not that it was empty — an empty array IS a value: the cleared
  // state of a text/conceptSet filter, which has to be restorable too.
  if (typeof value === 'undefined') return
  try {
    await dispatch('updateConstraintValue', { constraintId, value })
  } catch (e) {
    console.error('[constraintValueSnapshot] restoring the value failed', e)
  }
}
