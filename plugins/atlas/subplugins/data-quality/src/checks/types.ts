/**
 * One DQD check result, as the checks view uses it: a subset of jobplugins'
 * IDataQualityCheckResult (plugins/functions/jobplugins/src/types.ts), which
 * GET /dqd/data-quality/flow-run/:id/results returns.
 */
export interface DqdCheckRow {
  /** Added by parseCheckResults: unique per row, for the table and expansion. */
  key: string;
  checkId?: string;
  checkName: string;
  checkLevel?: string;
  severity?: string;
  checkDescription?: string;
  category: string;
  subcategory?: string;
  context?: string;
  cdmTableName?: string;
  cdmFieldName?: string;
  conceptId?: string;
  unitConceptId?: string;
  /** 1 when the check failed. */
  failed: number;
  passed?: number;
  /** 1 when the check's SQL errored. */
  isError?: number;
  /** 1 when the check does not apply to this data. */
  notApplicable?: number;
  error?: string;
  notesValue?: string;
  numViolatedRows?: number;
  pctViolatedRows?: number;
  numDenominatorRows?: number;
  executionTime?: string;
  queryText?: string;
}

/** The host's i18n lookup, `t(key, fallback)` (see DqHostCtx). */
export type Translate = (key: string, fallback?: string) => string;
