import { parseNumericInput, type NumericFilterValue } from './dashboardFlowUtils'

export type ConstraintDispatch = (action: string, payload?: unknown) => Promise<unknown>

/**
 * Normalize a raw value into the internal constraint format and dispatch the
 * matching store action. Shared by the dashboard wizard flow and the WebMCP
 * deterministic cohort-patch applier so AI-driven and UI-driven edits use the
 * exact same normalization logic.
 */
export async function applyConstraintValue(
  dispatch: ConstraintDispatch,
  constraint: any,
  rawInput: any,
  operator = '=',
  displayValue?: string
): Promise<any> {
  const constraintType = constraint.props.type
  if (constraintType === 'num') {
    let parsedValues: NumericFilterValue[] = []
    if (typeof rawInput === 'string') {
      parsedValues = parseNumericInput(rawInput)
      if (
        operator &&
        operator !== '=' &&
        /^-?\d+(?:\.\d+)?$/.test(rawInput.trim()) &&
        parsedValues.length === 1 &&
        parsedValues[0].op === '='
      ) {
        parsedValues[0].op = operator
      }
    } else if (typeof rawInput === 'number') {
      parsedValues = [{ op: operator || '=', value: rawInput }]
    } else if (rawInput !== null && typeof rawInput !== 'undefined') {
      const numericValue = Number(rawInput)
      if (!Number.isNaN(numericValue)) {
        parsedValues = [{ op: operator || '=', value: numericValue }]
      }
    }
    if (!parsedValues.length) {
      console.error('[ConstraintValue] Invalid numeric value:', { rawInput, constraint })
      return Promise.reject(new Error(`Invalid numeric value for ${constraint.props.name || constraint.id}`))
    }
    return dispatch('updateConstraintValue', {
      constraintId: constraint.id,
      value: parsedValues,
    })
  }
  // A range value arrives as an object carrying both { from, to } keys. That is the
  // only meaning of a { from, to } payload, so it is handled here regardless of the
  // constraint type, and BEFORE the time/datetime branch below (which only handles
  // scalar / { value } dates). A { from, to } object must never fall through to that
  // branch — the ordering would otherwise silently mis-route it.
  if (rawInput && typeof rawInput === 'object' && 'from' in rawInput && 'to' in rawInput) {
    const from = rawInput.from
    const to = rawInput.to
    if (!from && !to) {
      return Promise.reject(new Error(`Missing year value for ${constraint.props.name || constraint.id}`))
    }
    // Fall back to the populated bound when only one side is given.
    const fromRaw = from || to
    const toRaw = to || from
    // Bare 4-digit years (the wizard's yearRange) expand to the full calendar year;
    // full date strings are parsed as-is
    const isYear = (value: unknown) => typeof value === 'number' || /^\d{4}$/.test(String(value).trim())
    const asYearRange = isYear(fromRaw) && isYear(toRaw)
    const fromDate = asYearRange ? new Date(`${fromRaw}-01-01`) : new Date(fromRaw)
    const toDate = asYearRange ? new Date(`${toRaw}-12-31`) : new Date(toRaw)
    return dispatch('updateDateConstraintValue', {
      constraintId: constraint.id,
      fromDateValue: fromDate,
      toDateValue: toDate,
      isUTC: false,
    })
  }
  if (constraintType === 'time' || constraintType === 'datetime') {
    const fromDateRaw = rawInput?.from || rawInput?.value || rawInput
    const toDateRaw = rawInput?.to || rawInput?.value || rawInput
    if (!fromDateRaw && !toDateRaw) {
      return Promise.reject(new Error(`Missing date value for ${constraint.props.name || constraint.id}`))
    }
    const fromDate = new Date(fromDateRaw || toDateRaw)
    const toDate = new Date(toDateRaw || fromDateRaw)
    return dispatch('updateDateConstraintValue', {
      constraintId: constraint.id,
      fromDateValue: fromDate,
      toDateValue: toDate,
      isUTC: false,
    })
  }
  const rawValue = rawInput?.value ?? rawInput
  if (rawValue === null || typeof rawValue === 'undefined' || String(rawValue).trim() === '') {
    // An emptied free-text or concept-set filter is a *clear*, not an error: the
    // required-filters modal has to be able to remove a value it previously set.
    if (constraintType === 'text' || constraintType === 'conceptSet') {
      return dispatch('updateConstraintValue', {
        constraintId: constraint.id,
        value: [],
      })
    }
    return Promise.reject(new Error(`Missing value for ${constraint.props.name || constraint.id}`))
  }
  // Never String() an object into "[object Object]" — that silently produces a broken
  // filter (empty chart, patient count "--"). Date ranges ({ from, to }) are handled by
  // the branches above; by this point only a scalar value (string or number) is
  // supported, so any object reaching here is a caller bug.
  if (typeof rawValue === 'object') {
    return Promise.reject(
      new Error(
        `Unsupported object value for ${constraint.props.name || constraint.id}: ` +
          'pass a scalar value (string or number).'
      )
    )
  }
  const finalDisplayValue = displayValue || rawInput?.displayName || String(rawValue)
  return dispatch('updateConstraintValue', {
    constraintId: constraint.id,
    value: [
      {
        value: String(rawValue),
        score: 1,
        display_value: finalDisplayValue,
        text: finalDisplayValue,
      },
    ],
  })
}
