import type { DqdCheckRow } from './types';

/** A check row with every required field; override what a test cares about. */
export function row(overrides: Partial<DqdCheckRow> = {}): DqdCheckRow {
  return {
    key: 'c1#0',
    checkId: 'c1',
    checkName: 'plausibleValueLow',
    checkLevel: 'FIELD',
    checkDescription: 'The number of records with a value below the plausible low',
    category: 'Plausibility',
    subcategory: 'Atemporal',
    context: 'Verification',
    cdmTableName: 'MEASUREMENT',
    cdmFieldName: 'value_as_number',
    failed: 1,
    passed: 0,
    isError: 0,
    notApplicable: 0,
    pctViolatedRows: 0.25,
    queryText: 'SELECT 1',
    ...overrides,
  };
}
