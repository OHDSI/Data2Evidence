import { ResourceUploadConfig } from "./resource-upload.config.ts";
import { isContentValid } from "./resource-upload.content.ts";

// Lower-cased text after the last dot, or "" when there is none
// ("report.pdf.exe" -> "exe", "Makefile" -> "", ".env" -> "").
export const getFileExtension = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(lastDot + 1).toLowerCase() : "";
};

// A file name may only use English letters, digits, spaces, "-", "_", "."
// and brackets "(" ")". The storage service refuses many other characters
// (e.g. "#", "%", "ä" or Chinese letters), and "/" or "\" would start a
// folder. Brackets also let a numbered duplicate ("abcd (1).pdf") be
// uploaded again as it is.
const ALLOWED_FILE_NAME = /^[A-Za-z0-9 _.()-]+$/;

export const isFileNameAllowed = (fileName: string): boolean => ALLOWED_FILE_NAME.test(fileName);

export const FILE_NAME_MESSAGE =
  "This file name has characters that aren’t supported. Rename the file using only letters, numbers, spaces, hyphens (-), underscores (_), periods (.) or brackets ( ), then try again.";

// The name to store a file under so it never replaces one already there: the
// name itself if it is free, otherwise "<name> (n).<ext>" with the lowest
// free n from 1. Names are compared ignoring case, base name and extension
// alike, so "ABCD.PDF" counts as taken by "abcd.pdf".
export const nextFreeFileName = (fileName: string, existingNames: string[]): string => {
  const taken = new Set(existingNames.map((name) => name.toLowerCase()));
  if (!taken.has(fileName.toLowerCase())) return fileName;

  const lastDot = fileName.lastIndexOf(".");
  const base = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
  const extension = lastDot > 0 ? fileName.slice(lastDot) : "";
  for (let n = 1; ; n++) {
    const candidate = `${base} (${n})${extension}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
};

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
// undefined when it is allowed. Checked in order (extension, name, empty,
// content, size), so a file of the wrong type only ever gets the type error.
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
  if (!isFileNameAllowed(file.name)) {
    return FILE_NAME_MESSAGE;
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
