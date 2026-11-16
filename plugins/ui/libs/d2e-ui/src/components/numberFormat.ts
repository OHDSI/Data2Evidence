const FALLBACK_LOCALE = "en";
const MAX_FRACTION_DIGITS = 10;

function numberFormatter(locale: string | undefined): Intl.NumberFormat {
  const options = { maximumFractionDigits: MAX_FRACTION_DIGITS };
  try {
    return new Intl.NumberFormat(locale || FALLBACK_LOCALE, options);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return new Intl.NumberFormat(FALLBACK_LOCALE, options);
  }
}

export function formatNumber(value: number, locale?: string): string {
  if (!Number.isFinite(value)) return String(value);
  return numberFormatter(locale).format(value);
}
