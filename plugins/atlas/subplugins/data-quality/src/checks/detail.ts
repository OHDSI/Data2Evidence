import { formatViolatedPercent } from './format';
import type { DqdCheckRow, Translate } from './types';

const EMPTY = '-';

const text = (value: string | number | undefined | null): string =>
  value === undefined || value === null || value === '' ? EMPTY : String(value);

const flag = (value: number | undefined): string => (value === 1 ? 'Yes' : 'No');

/**
 * The expanded row's label and value list: the same fields, in the same order,
 * as the portal DQD table's detail panel (components/DQD/DQDTable). The portal
 * labels the check name "LEVEL"; it is labelled as what it is here.
 */
export function detailRows(row: DqdCheckRow, t: Translate): { label: string; value: string }[] {
  const entries: [key: string, fallback: string, value: string][] = [
    ['checkName', 'Check name', text(row.checkName)],
    ['description', 'Description', text(row.checkDescription)],
    ['notes', 'Notes', text(row.notesValue)],
    ['level', 'Level', text(row.checkLevel)],
    ['table', 'Table', text(row.cdmTableName)],
    ['field', 'Field', text(row.cdmFieldName)],
    ['conceptId', 'Concept ID', text(row.conceptId)],
    ['unitConceptId', 'Unit concept ID', text(row.unitConceptId)],
    ['notApplicable', 'Not applicable', flag(row.notApplicable)],
    ['checkId', 'Check ID', text(row.checkId)],
    ['violatedRows', 'Violated rows', text(row.numViolatedRows)],
    ['pctViolatedRows', '% violated rows', text(formatViolatedPercent(row.pctViolatedRows))],
    ['denominatorRows', 'Denominator rows', text(row.numDenominatorRows)],
    ['executionTime', 'Execution time', text(row.executionTime)],
    ['isError', 'Is error', flag(row.isError)],
    ['error', 'Error', text(row.error)],
    ['query', 'Query', text(row.queryText)],
  ];
  return entries.map(([key, fallback, value]) => ({
    label: t(`plugins.dataQuality.checks.detail.${key}`, fallback),
    value,
  }));
}
