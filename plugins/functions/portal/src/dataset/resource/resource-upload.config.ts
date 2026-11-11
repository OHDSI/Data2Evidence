import { env } from "../../env.ts";

// Every format the backend knows how to validate. Config can narrow this list,
// but never widen it, so an executable or script type can't be switched on by
// mistake.
export const SUPPORTED_RESOURCE_EXTENSIONS = [
  "pdf",
  "csv",
  "json",
  "xlsx",
  "docx",
  "sql",
  "md",
  "txt",
] as const;

export const DEFAULT_MAX_FILE_SIZE_MB = 25;

const BYTES_PER_MB = 1024 * 1024;

export interface ResourceUploadConfig {
  maxFileSizeBytes: number;
  allowedExtensions: string[];
}

const parseMaxFileSizeBytes = (maxFileSizeMb?: string): number => {
  if (maxFileSizeMb === undefined || maxFileSizeMb.trim() === "") {
    return DEFAULT_MAX_FILE_SIZE_MB * BYTES_PER_MB;
  }
  const value = Number(maxFileSizeMb);
  if (!Number.isFinite(value) || value <= 0) {
    console.warn(
      `Invalid RESOURCE_UPLOAD_MAX_FILE_SIZE_MB "${maxFileSizeMb}"; using ${DEFAULT_MAX_FILE_SIZE_MB} MB.`,
    );
    return DEFAULT_MAX_FILE_SIZE_MB * BYTES_PER_MB;
  }
  return Math.floor(value * BYTES_PER_MB);
};

const parseAllowedExtensions = (allowedExtensions?: string): string[] => {
  if (allowedExtensions === undefined || allowedExtensions.trim() === "") {
    return [...SUPPORTED_RESOURCE_EXTENSIONS];
  }

  const supported: readonly string[] = SUPPORTED_RESOURCE_EXTENSIONS;
  const requested = allowedExtensions
    .split(",")
    .map((ext) => ext.trim().toLowerCase().replace(/^\./, ""))
    .filter((ext) => ext !== "");

  const unsupported = requested.filter((ext) => !supported.includes(ext));
  if (unsupported.length > 0) {
    console.warn(
      `RESOURCE_UPLOAD_ALLOWED_EXTENSIONS contains unsupported types, ignoring: ${unsupported.join(", ")}`,
    );
  }

  const allowed = [...new Set(requested.filter((ext) => supported.includes(ext)))];
  if (allowed.length === 0) {
    console.warn(
      "RESOURCE_UPLOAD_ALLOWED_EXTENSIONS has no supported types; using the default list.",
    );
    return [...SUPPORTED_RESOURCE_EXTENSIONS];
  }
  return allowed;
};

export const parseResourceUploadConfig = (
  maxFileSizeMb?: string,
  allowedExtensions?: string,
): ResourceUploadConfig => ({
  maxFileSizeBytes: parseMaxFileSizeBytes(maxFileSizeMb),
  allowedExtensions: parseAllowedExtensions(allowedExtensions),
});

// The env vars only change on a restart, so parse them once. This also keeps
// any config warning to a single log line instead of one per request.
let cachedConfig: ResourceUploadConfig | undefined;

export const getResourceUploadConfig = (): ResourceUploadConfig => {
  cachedConfig ??= parseResourceUploadConfig(
    env.RESOURCE_UPLOAD_MAX_FILE_SIZE_MB,
    env.RESOURCE_UPLOAD_ALLOWED_EXTENSIONS,
  );
  return cachedConfig;
};
