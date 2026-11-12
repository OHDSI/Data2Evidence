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

export type ResourceFileError = "type" | "empty" | "size";

// Checks a picked file against the upload rules: type first, then size, so a
// file of the wrong type only ever gets the type error. Mirrors the backend
// check in plugins/functions/portal/src/dataset/resource/resource-upload.validation.ts.
export const validateResourceFile = (
  file: { name: string; size: number },
  config: { allowedExtensions: string[]; maxFileSizeBytes: number }
): ResourceFileError | undefined => {
  const lastDot = file.name.lastIndexOf(".");
  const extension = lastDot > 0 ? file.name.slice(lastDot + 1).toLowerCase() : "";
  if (!config.allowedExtensions.includes(extension)) return "type";
  if (file.size === 0) return "empty";
  if (file.size > config.maxFileSizeBytes) return "size";
  return undefined;
};
