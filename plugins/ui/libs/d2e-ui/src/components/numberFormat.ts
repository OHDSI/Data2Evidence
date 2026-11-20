const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 10,
});

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  return NUMBER_FORMATTER.format(value);
}
