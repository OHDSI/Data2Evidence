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
  if (rawInput && typeof rawInput === 'object' && 'from' in rawInput && 'to' in rawInput) {
    const fromYear = rawInput.from
    const toYear = rawInput.to
    if (!fromYear && !toYear) {
      return Promise.reject(new Error(`Missing year value for ${constraint.props.name || constraint.id}`))
    }
    const fromDate = fromYear ? new Date(`${fromYear}-01-01`) : new Date(`${toYear}-01-01`)
    const toDate = toYear ? new Date(`${toYear}-12-31`) : new Date(`${fromYear}-12-31`)
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
    return Promise.reject(new Error(`Missing value for ${constraint.props.name || constraint.id}`))
  }
  // Never String() an object into "[object Object]" — that silently produces a broken
  // filter (empty chart, patient count "--"). A concept set must be { conceptSetId },
  // a date range { from, to }; anything else reaching here is a caller bug.
  if (typeof rawValue === 'object') {
    return Promise.reject(
      new Error(
        `Unsupported object value for ${constraint.props.name || constraint.id}: ` +
          'pass { conceptSetId } for a concept set or { from, to } for a date range.'
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
