import { ResourceUploadConfig } from "./resource-upload.config.ts";
import { isContentValid } from "./resource-upload.content.ts";

// Lower-cased text after the last dot, or "" when there is none
// ("report.pdf.exe" -> "exe", "Makefile" -> "", ".env" -> "").
export const getFileExtension = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(lastDot + 1).toLowerCase() : "";
};

// Characters the storage service accepts in an object name (its isValidKey:
// ASCII letters, digits, "_" and these symbols). "/" is left out on purpose:
// it would start a folder.
const STORAGE_NAME_CHARACTER = /[A-Za-z0-9_!\-.*'()&$@=;:+,? ]/u;

// The name a file is stored under. Storage refuses any other character, e.g.
// "#", "%", "ä" or Chinese letters, so each one becomes "_": "Ärzte#1.pdf" is
// stored as "_rzte_1.pdf". NFC first, so a letter with an accent counts as one
// character whichever way the operating system wrote it.
export const toStorageFileName = (fileName: string): string =>
  Array.from(fileName.normalize("NFC"), (char) => (STORAGE_NAME_CHARACTER.test(char) ? char : "_")).join("");

const formatMaxFileSize = (maxFileSizeBytes: number): string => {
  const mb = maxFileSizeBytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : Number(mb.toFixed(1))} MB`;
};

const formatTypeList = (allowedExtensions: string[]): string => {
  const types = allowedExtensions.map((ext) => ext.toUpperCase());
  if (types.length < 2) return types.join("");
  return `${types.slice(0, -1).join(", ")} or ${types[types.length - 1]}`;
};

// Returns the error message for a file that breaks the upload rules, or
// undefined when it is allowed. Checked in order (extension, empty, content,
// size), so a file of the wrong type only ever gets the type error.
// `content` is the start of the file, up to the size limit. English only,
// like other portal API errors; the Add file dialog shows its own translated
// message first.
export const validateResourceFile = (
  file: { name: string; size: number },
  config: ResourceUploadConfig,
  content: Uint8Array,
): string | undefined => {
  const extension = getFileExtension(file.name);
  if (!config.allowedExtensions.includes(extension)) {
    return `This file type isn't supported. Upload a ${formatTypeList(config.allowedExtensions)} file.`;
  }
  if (file.size === 0) {
    return "This file is empty.";
  }
  if (!isContentValid(content, extension)) {
    return "This file can\u2019t be opened. It may be damaged or saved in a different format. Check the file or choose a different one.";
  }
  if (file.size > config.maxFileSizeBytes) {
    return `This file is too large. Files must be ${formatMaxFileSize(config.maxFileSizeBytes)} or smaller.`;
  }
  return undefined;
};
