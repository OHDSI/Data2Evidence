import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { parseResourceUploadConfig } from "./resource-upload.config.ts";
import { getFileExtension, validateResourceFile } from "./resource-upload.validation.ts";

const defaults = parseResourceUploadConfig(undefined, undefined);
const TYPE_ERROR =
  "This file type isn't supported. Upload a PDF, CSV, JSON, XLSX, DOCX, SQL, MD or TXT file.";

const check = (name: string, config = defaults) => validateResourceFile({ name }, config);

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
