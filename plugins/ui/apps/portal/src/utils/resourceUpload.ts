import { isContentValid } from "./resourceContent";

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

export type ResourceFileError = "type" | "empty" | "corrupted" | "size";

type UploadRules = { allowedExtensions: string[]; maxFileSizeBytes: number };

const getExtension = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(lastDot + 1).toLowerCase() : "";
};

// Checks a file against the upload rules in order (extension, empty, content,
// size), so a file of the wrong type only ever gets the type error. `content`
// is the start of the file, up to the size limit. Mirrors the backend check in
// plugins/functions/portal/src/dataset/resource/resource-upload.validation.ts.
export const validateResourceFile = (
  file: { name: string; size: number },
  config: UploadRules,
  content: Uint8Array
): ResourceFileError | undefined => {
  const extension = getExtension(file.name);
  if (!config.allowedExtensions.includes(extension)) return "type";
  if (file.size === 0) return "empty";
  if (!isContentValid(content, extension)) return "corrupted";
  if (file.size > config.maxFileSizeBytes) return "size";
  return undefined;
};

// Reads at most `maxBytes` from the start of a file. FileReader rather than
// Blob.arrayBuffer() so it also works in the test environment.
const readFileStart = (file: Blob, maxBytes: number): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.slice(0, maxBytes));
  });

// Checks a picked file. Only reads the file when the cheap checks pass.
export const checkResourceFile = async (file: File, config: UploadRules): Promise<ResourceFileError | undefined> => {
  if (!config.allowedExtensions.includes(getExtension(file.name)) || file.size === 0) {
    return validateResourceFile(file, config, new Uint8Array());
  }
  return validateResourceFile(file, config, await readFileStart(file, config.maxFileSizeBytes));
};
