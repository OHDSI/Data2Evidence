import { ResourceUploadConfig } from "./resource-upload.config.ts";

// Lower-cased text after the last dot, or "" when there is none
// ("report.pdf.exe" -> "exe", "Makefile" -> "", ".env" -> "").
export const getFileExtension = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(lastDot + 1).toLowerCase() : "";
};

const formatTypeList = (allowedExtensions: string[]): string => {
  const types = allowedExtensions.map((ext) => ext.toUpperCase());
  if (types.length < 2) return types.join("");
  return `${types.slice(0, -1).join(", ")} or ${types[types.length - 1]}`;
};

// Returns the error message for a file that breaks the upload rules, or
// undefined when it is allowed. English only, like other portal API errors;
// the Add file dialog shows its own translated message first.
export const validateResourceFile = (
  file: { name: string },
  config: ResourceUploadConfig,
): string | undefined => {
  if (!config.allowedExtensions.includes(getFileExtension(file.name))) {
    return `This file type isn't supported. Upload a ${formatTypeList(config.allowedExtensions)} file.`;
  }
  return undefined;
};
