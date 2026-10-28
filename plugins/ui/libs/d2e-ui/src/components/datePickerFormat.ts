const TOKEN_LENGTHS = { YYYY: 4, MM: 2, DD: 2, HH: 2, mm: 2, ss: 2 } as const;

type Token = keyof typeof TOKEN_LENGTHS;

const TOKEN_PATTERN = /YYYY|MM|DD|HH|mm|ss/g;
const TIME_TOKEN_PATTERN = /HH|mm|ss/;

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidDate = (date: Date | null | undefined): date is Date =>
  date instanceof Date && !Number.isNaN(date.getTime());

const tokenValues = (date: Date): Record<Token, number> => ({
  YYYY: date.getFullYear(),
  MM: date.getMonth() + 1,
  DD: date.getDate(),
  HH: date.getHours(),
  mm: date.getMinutes(),
  ss: date.getSeconds(),
});

export function formatDate(
  date: Date | null | undefined,
  format: string
): string {
  if (!isValidDate(date)) return "";
  const values = tokenValues(date);
  return format.replace(TOKEN_PATTERN, (token) =>
    String(values[token as Token]).padStart(TOKEN_LENGTHS[token as Token], "0")
  );
}

export function hasTime(format: string): boolean {
  return TIME_TOKEN_PATTERN.test(format);
}

function compile(format: string): { pattern: RegExp; tokens: Token[] } {
  const tokens = (format.match(TOKEN_PATTERN) ?? []) as Token[];
  const source = format
    .split(TOKEN_PATTERN)
    .map((literal, index) => {
      const token = tokens[index];
      const digits = token ? `(\\d{${TOKEN_LENGTHS[token]}})` : "";
      return `${escapeRegExp(literal)}${digits}`;
    })
    .join("");
  return { pattern: new RegExp(`^${source}$`), tokens };
}

function parseExact(text: string, format: string): Date | null {
  const { pattern, tokens } = compile(format);
  const match = pattern.exec(text);
  if (!match) return null;

  const values: Partial<Record<Token, number>> = Object.fromEntries(
    tokens.map((token, index) => [token, Number(match[index + 1])])
  );
  const date = new Date(
    values.YYYY ?? 0,
    (values.MM ?? 1) - 1,
    values.DD ?? 1,
    values.HH ?? 0,
    values.mm ?? 0,
    values.ss ?? 0
  );
  return formatDate(date, format) === text ? date : null;
}

function dateOnlyFormat(format: string): string {
  const timeStart = format.search(TIME_TOKEN_PATTERN);
  return timeStart === -1 ? format : format.slice(0, timeStart).trimEnd();
}

export function parseDate(text: string, format: string): Date | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return (
    parseExact(trimmed, format) ??
    (hasTime(format) ? parseExact(trimmed, dateOnlyFormat(format)) : null)
  );
}

const dayStamp = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export function isWithinDays(
  date: Date,
  min: Date | null | undefined,
  max: Date | null | undefined
): boolean {
  if (isValidDate(min) && dayStamp(date) < dayStamp(min)) return false;
  if (isValidDate(max) && dayStamp(date) > dayStamp(max)) return false;
  return true;
}

export function withTimeOf(day: Date, timeSource: Date | null): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    timeSource?.getHours() ?? 0,
    timeSource?.getMinutes() ?? 0,
    timeSource?.getSeconds() ?? 0
  );
}
