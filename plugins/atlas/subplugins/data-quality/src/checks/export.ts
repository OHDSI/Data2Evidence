import { COLUMNS } from './columns';
import type { DqdCheckRow } from './types';

interface CsvColumn {
  key: string;
  title: string;
  value: (row: DqdCheckRow) => string | number;
}

const field = (key: keyof DqdCheckRow) => (row: DqdCheckRow) => {
  const value = row[key];
  return value === undefined || value === null ? '' : (value as string | number);
};

/**
 * The CSV's columns: every table column (the status as its English label), then
 * the detail fields. Not `queryText` - the SQL is long, multi-line and of no use
 * in a spreadsheet; the JSON export keeps it.
 */
export const CSV_COLUMNS: CsvColumn[] = [
  ...COLUMNS.map((column) => ({ key: column.key, title: column.fallback, value: column.value })),
  { key: 'checkId', title: 'Check ID', value: field('checkId') },
  { key: 'conceptId', title: 'Concept ID', value: field('conceptId') },
  { key: 'unitConceptId', title: 'Unit concept ID', value: field('unitConceptId') },
  { key: 'notApplicable', title: 'Not applicable', value: field('notApplicable') },
  { key: 'isError', title: 'Is error', value: field('isError') },
  { key: 'error', title: 'Error', value: field('error') },
  { key: 'numViolatedRows', title: 'Violated rows', value: field('numViolatedRows') },
  { key: 'numDenominatorRows', title: 'Denominator rows', value: field('numDenominatorRows') },
  { key: 'executionTime', title: 'Execution time', value: field('executionTime') },
];

/** RFC 4180: quote a field holding a comma, a quote or a line break; double its quotes. */
function csvField(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: readonly DqdCheckRow[]): string {
  const header = CSV_COLUMNS.map((column) => csvField(column.title)).join(',');
  const lines = rows.map((row) => CSV_COLUMNS.map((column) => csvField(column.value(row))).join(','));
  return [header, ...lines].join('\r\n');
}

/** The full rows, as the backend sent them, without the table's own key. */
export function toJson(rows: readonly DqdCheckRow[]): string {
  return JSON.stringify(
    rows.map(({ key: _key, ...rest }) => rest),
    null,
    2,
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/** data-quality-checks-YYYY-MM-DD.<ext>, in the user's local date. */
export function exportFileName(ext: 'csv' | 'json', now: Date = new Date()): string {
  return `data-quality-checks-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.${ext}`;
}

/** Saves text as a file through a temporary object URL. */
export function downloadText(text: string, fileName: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
