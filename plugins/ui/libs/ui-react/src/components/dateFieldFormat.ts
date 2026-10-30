// ISO `YYYY-MM-DD` <-> Date, always from local parts (never toISOString, which
// shifts to UTC and can roll the date back a day east of UTC).

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toIsoDate(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;

  const yyyy = String(date.getFullYear()).padStart(4, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

export function fromIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  // Reject a valid-looking but non-existent date (e.g. 2026-02-31).
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}
