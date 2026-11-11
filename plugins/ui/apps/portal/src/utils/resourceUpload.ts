const BYTES_PER_MB = 1024 * 1024;

// Value for <input type="file" accept>, e.g. ".pdf,.csv". Browsers match it
// case-insensitively, so ".CSV" files are still shown.
export const toAcceptAttribute = (allowedExtensions: string[]): string =>
  allowedExtensions.map((ext) => `.${ext}`).join(",");

// "PDF, CSV, JSON" or, with a last separator, "PDF, CSV or JSON".
export const formatFileTypeList = (allowedExtensions: string[], lastSeparator?: string): string => {
  const types = allowedExtensions.map((ext) => ext.toUpperCase());
  if (!lastSeparator || types.length < 2) return types.join(", ");
  return `${types.slice(0, -1).join(", ")} ${lastSeparator} ${types[types.length - 1]}`;
};

// "25 MB", or "0.5 MB" for limits that aren't whole megabytes.
export const formatMaxFileSize = (maxFileSizeBytes: number): string => {
  const mb = maxFileSizeBytes / BYTES_PER_MB;
  return `${Number.isInteger(mb) ? mb : Number(mb.toFixed(1))} MB`;
};
