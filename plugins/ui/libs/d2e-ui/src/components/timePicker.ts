export const HOURS_IN_DAY = 24;
export const MINUTES_IN_HOUR = 60;
export const DEFAULT_MINUTE_STEP = 5;

export const HOUR_OPTIONS: readonly number[] = Array.from(
  { length: HOURS_IN_DAY },
  (_, hour) => hour
);

export function minuteOptions(step: number): number[] {
  const safeStep =
    Number.isInteger(step) && step > 0 && step <= MINUTES_IN_HOUR
      ? step
      : DEFAULT_MINUTE_STEP;
  return Array.from(
    { length: Math.ceil(MINUTES_IN_HOUR / safeStep) },
    (_, index) => index * safeStep
  );
}

export const padTimePart = (value: number) => String(value).padStart(2, "0");

export const selectedHour = (date: Date | null): number | null =>
  date ? date.getHours() : null;

export function selectedMinute(
  date: Date | null,
  options: readonly number[]
): number | null {
  if (!date) return null;
  const minute = date.getMinutes();
  return options.includes(minute) ? minute : null;
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
