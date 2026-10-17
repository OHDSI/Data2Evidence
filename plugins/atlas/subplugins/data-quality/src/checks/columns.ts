import { statusLabel } from './status';
import type { DqdCheckRow } from './types';

export interface CheckColumn {
  key: string;
  titleKey: string;
  fallback: string;
  defaultVisible: boolean;
  /** The cell's value for search, sort and export. '' when the row has none. */
  value: (row: DqdCheckRow) => string | number;
}

const text = (value: string | undefined): string => value ?? '';

/**
 * The table's columns. The first six are the design's (Figma 1801:210534); the
 * rest are the portal DQD table's, hidden until the column menu shows them.
 */
export const COLUMNS: CheckColumn[] = [
  { key: 'category', titleKey: 'category', fallback: 'Category', defaultVisible: true, value: (r) => r.category },
  { key: 'checkName', titleKey: 'checkName', fallback: 'Check name', defaultVisible: true, value: (r) => r.checkName },
  {
    key: 'cdmTableName',
    titleKey: 'table',
    fallback: 'Table',
    defaultVisible: true,
    value: (r) => text(r.cdmTableName),
  },
  {
    key: 'cdmFieldName',
    titleKey: 'field',
    fallback: 'Field',
    defaultVisible: true,
    value: (r) => text(r.cdmFieldName),
  },
  { key: 'checkLevel', titleKey: 'level', fallback: 'Level', defaultVisible: true, value: (r) => text(r.checkLevel) },
  { key: 'status', titleKey: 'status', fallback: 'Status', defaultVisible: true, value: statusLabel },
  {
    key: 'subcategory',
    titleKey: 'subcategory',
    fallback: 'Subcategory',
    defaultVisible: false,
    value: (r) => text(r.subcategory),
  },
  { key: 'context', titleKey: 'context', fallback: 'Context', defaultVisible: false, value: (r) => text(r.context) },
  {
    key: 'checkDescription',
    titleKey: 'description',
    fallback: 'Description',
    defaultVisible: false,
    value: (r) => text(r.checkDescription),
  },
  { key: 'notesValue', titleKey: 'notes', fallback: 'Notes', defaultVisible: false, value: (r) => text(r.notesValue) },
  {
    key: 'pctViolatedRows',
    titleKey: 'pctViolatedRows',
    fallback: '% violated rows',
    defaultVisible: false,
    value: (r) => (typeof r.pctViolatedRows === 'number' ? r.pctViolatedRows : ''),
  },
];

export const COLUMN_BY_KEY: Record<string, CheckColumn> = Object.fromEntries(COLUMNS.map((c) => [c.key, c]));

export const DEFAULT_VISIBLE_KEYS: string[] = COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key);
