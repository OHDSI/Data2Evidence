import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { parseResourceUploadConfig } from "./resource-upload.config.ts";
import { getFileExtension, validateResourceFile } from "./resource-upload.validation.ts";

const defaults = parseResourceUploadConfig(undefined, undefined);
const TYPE_ERROR =
  "This file type isn't supported. Upload a PDF, CSV, JSON, XLSX, DOCX, SQL, MD or TXT file.";

const check = (name: string, config = defaults, size = 100) =>
  validateResourceFile({ name, size }, config);

describe("getFileExtension", () => {
  it("returns the last extension in lower case", () => {
    assertEquals(getFileExtension("data.CSV"), "csv");
    assertEquals(getFileExtension("report.pdf.exe"), "exe");
  });

  it("returns an empty string when there is no extension", () => {
    assertEquals(getFileExtension("Makefile"), "");
    assertEquals(getFileExtension(".env"), "");
    assertEquals(getFileExtension("trailing."), "");
  });
});

describe("validateResourceFile: file type", () => {
  it("accepts every allowed type", () => {
    for (const ext of ["pdf", "csv", "json", "xlsx", "docx", "sql", "md", "txt"]) {
      assertEquals(check(`file.${ext}`), undefined, ext);
    }
  });

  it("accepts allowed extensions in any case", () => {
    assertEquals(check("data.CSV"), undefined);
    assertEquals(check("report.Pdf"), undefined);
  });

  it("always rejects executable and script files", () => {
    for (const name of ["a.exe", "a.sh", "a.bat", "a.js", "a.html", "a.R", "a.EXE"]) {
      assertEquals(check(name), TYPE_ERROR, name);
    }
  });

  it("rejects files with no extension or a disguised final extension", () => {
    assertEquals(check("Makefile"), TYPE_ERROR);
    assertEquals(check("report.pdf.exe"), TYPE_ERROR);
  });

  it("follows a narrowed config and lists only its types", () => {
    const pdfAndCsv = parseResourceUploadConfig(undefined, "pdf,csv");
    assertEquals(check("data.csv", pdfAndCsv), undefined);
    assertEquals(
      check("cohort.json", pdfAndCsv),
      "This file type isn't supported. Upload a PDF or CSV file.",
    );
  });
});

describe("validateResourceFile: file size", () => {
  const MB = 1024 * 1024;

  it("rejects an empty file", () => {
    assertEquals(check("notes.txt", defaults, 0), "This file is empty.");
  });

  it("accepts a file of exactly the limit and rejects one byte more", () => {
    assertEquals(check("data.csv", defaults, 25 * MB), undefined);
    assertEquals(
      check("data.csv", defaults, 25 * MB + 1),
      "This file is too large. Files must be 25 MB or smaller.",
    );
  });

  it("uses the configured limit in the check and the message", () => {
    const tenMb = parseResourceUploadConfig("10", undefined);
    assertEquals(
      check("data.csv", tenMb, 11 * MB),
      "This file is too large. Files must be 10 MB or smaller.",
    );
  });

  it("checks the type first, so a wrong type never gets a size error", () => {
    assertEquals(check("program.exe", defaults, 0), TYPE_ERROR);
    assertEquals(check("program.exe", defaults, 26 * MB), TYPE_ERROR);
  });
});
