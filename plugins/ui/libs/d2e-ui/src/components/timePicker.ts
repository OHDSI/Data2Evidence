export const HOURS_IN_DAY = 24;
export const MINUTES_IN_HOUR = 60;
const MINUTE_STEP = 5;

export const HOUR_OPTIONS: readonly number[] = Array.from(
  { length: HOURS_IN_DAY },
  (_, hour) => hour
);

export const MINUTE_OPTIONS: readonly number[] = Array.from(
  { length: MINUTES_IN_HOUR / MINUTE_STEP },
  (_, index) => index * MINUTE_STEP
);

export const padTimePart = (value: number) => String(value).padStart(2, "0");

export const selectedHour = (date: Date | null): number | null =>
  date ? date.getHours() : null;

export function selectedMinute(date: Date | null): number | null {
  if (!date) return null;
  const minute = date.getMinutes();
  return MINUTE_OPTIONS.includes(minute) ? minute : null;
}

const atTime = (day: Date, hours: number, minutes: number) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0);

export const withDay = (day: Date, draft: Date | null): Date =>
  atTime(day, draft?.getHours() ?? 0, draft?.getMinutes() ?? 0);

export const withHour = (draft: Date | null, hour: number, today: Date): Date =>
  atTime(draft ?? today, hour, draft?.getMinutes() ?? 0);

export const withMinute = (
  draft: Date | null,
  minute: number,
  today: Date
): Date => atTime(draft ?? today, draft?.getHours() ?? 0, minute);
