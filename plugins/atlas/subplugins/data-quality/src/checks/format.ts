export function formatViolatedPercent(fraction: number | undefined): string {
  if (typeof fraction !== 'number' || Number.isNaN(fraction)) return '';
  const percent = Math.round(fraction * 10000) / 100;
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(2)}%`;
}

export function formatSeverity(severity: string | undefined): string {
  return severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : '';
}
