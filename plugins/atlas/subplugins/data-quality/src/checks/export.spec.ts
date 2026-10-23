import { afterEach, describe, expect, it, vi } from 'vitest';
import { CSV_COLUMNS, downloadText, exportFileName, toCsv, toJson } from './export';
import { row } from './fixtures';

describe('toCsv formula guard', () => {
  it('prefixes a text field that a spreadsheet would read as a formula', () => {
    const [header, line] = toCsv([row({ error: '=HYPERLINK("x")', notesValue: '@SUM(1)', context: '+1' })]).split(
      '\r\n',
    );
    const cell = (title: string) => line.split(',')[header.split(',').indexOf(title)];
    expect(cell('Notes')).toBe("'@SUM(1)");
    expect(cell('Context')).toBe("'+1");
    expect(line).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it('leaves numbers and ordinary text alone', () => {
    const [header, line] = toCsv([row({ numViolatedRows: -3, notesValue: 'a-b' })]).split('\r\n');
    const cell = (title: string) => line.split(',')[header.split(',').indexOf(title)];
    expect(cell('Violated rows')).toBe('-3');
    expect(cell('Notes')).toBe('a-b');
  });
});

describe('downloadText', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('revokes the object URL only after the browser has had time to fetch it', () => {
    vi.useFakeTimers();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    downloadText('a', 'a.csv', 'text/csv');
    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:x');
  });
});

describe('toCsv', () => {
  it('writes a header and one CRLF line per row, without queryText', () => {
    const csv = toCsv([row(), row({ key: 'c2#1', checkId: 'c2' })]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0].split(',')).toEqual(CSV_COLUMNS.map((c) => c.title));
    expect(csv).not.toContain('SELECT 1');
    expect(CSV_COLUMNS.map((c) => c.key)).not.toContain('queryText');
  });

  it('quotes a field with a comma, quote or line break, doubling quotes', () => {
    const csv = toCsv([row({ checkDescription: 'a, "b"\nc' })]);
    expect(csv).toContain('"a, ""b""\nc"');
  });

  it('writes the status as its English label', () => {
    const csv = toCsv([row({ failed: 1 })]);
    expect(csv.split('\r\n')[1]).toContain(',Failed,');
  });

  it('writes the severity label and % violated rows as a percentage', () => {
    const [header, line] = toCsv([row({ severity: 'fatal', pctViolatedRows: 0.5003 })]).split('\r\n');
    const cell = (title: string) => line.split(',')[header.split(',').indexOf(title)];
    expect(cell('Severity')).toBe('Fatal');
    expect(cell('% violated rows')).toBe('50.03%');
  });
});

describe('toJson', () => {
  it('writes the full rows without the table key', () => {
    const parsed = JSON.parse(toJson([row()]));
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).not.toHaveProperty('key');
    expect(parsed[0].queryText).toBe('SELECT 1');
  });

  it('keeps the raw values the backend sent', () => {
    const [parsed] = JSON.parse(toJson([row({ severity: 'fatal', pctViolatedRows: 0.5003, failed: 1 })]));
    expect(parsed.severity).toBe('fatal');
    expect(parsed.pctViolatedRows).toBe(0.5003);
    expect(parsed.failed).toBe(1);
  });
});

describe('exportFileName', () => {
  it('uses the local date', () => {
    expect(exportFileName('csv', new Date(2026, 8, 3, 23, 30))).toBe('data-quality-checks-2026-09-03.csv');
  });
});
