import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import {
  DEFAULT_MAX_FILE_SIZE_MB,
  parseResourceUploadConfig,
  SUPPORTED_RESOURCE_EXTENSIONS,
} from "./resource-upload.config.ts";

const MB = 1024 * 1024;

describe("parseResourceUploadConfig", () => {
  it("uses 25 MB and every supported type when nothing is configured", () => {
    assertEquals(parseResourceUploadConfig(undefined, undefined), {
      maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_MB * MB,
      allowedExtensions: [...SUPPORTED_RESOURCE_EXTENSIONS],
    });
    assertEquals(parseResourceUploadConfig("", " "), {
      maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_MB * MB,
      allowedExtensions: [...SUPPORTED_RESOURCE_EXTENSIONS],
    });
  });

  it("reads the size limit in MB", () => {
    assertEquals(parseResourceUploadConfig("10").maxFileSizeBytes, 10 * MB);
    assertEquals(parseResourceUploadConfig("0.5").maxFileSizeBytes, MB / 2);
  });

  it("falls back to the default size when the value is not a positive number", () => {
    for (const value of ["abc", "0", "-5", "Infinity"]) {
      assertEquals(
        parseResourceUploadConfig(value).maxFileSizeBytes,
        DEFAULT_MAX_FILE_SIZE_MB * MB,
      );
    }
  });

  it("normalises the extension list: case, spaces, leading dots and duplicates", () => {
    assertEquals(
      parseResourceUploadConfig(undefined, " .PDF, csv ,Csv,txt ").allowedExtensions,
      ["pdf", "csv", "txt"],
    );
  });

  it("never allows a type the backend cannot validate, such as executables", () => {
    assertEquals(
      parseResourceUploadConfig(undefined, "pdf,exe,sh,html").allowedExtensions,
      ["pdf"],
    );
  });

  it("falls back to the default list when no configured type is supported", () => {
    assertEquals(
      parseResourceUploadConfig(undefined, "exe,bat").allowedExtensions,
      [...SUPPORTED_RESOURCE_EXTENSIONS],
    );
  });
});
