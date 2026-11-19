import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { parseResourceUploadConfig } from "./resource-upload.config.ts";
import { getFileExtension, toStorageFileName, validateResourceFile } from "./resource-upload.validation.ts";

// The characters the storage service accepts in a name (its isValidKey).
const STORAGE_KEY = /^(\w|\/|!|-|\.|\*|'|\(|\)| |&|\$|@|=|;|:|\+|,|\?)*$/;

describe("toStorageFileName", () => {
  it("keeps names storage accepts unchanged", () => {
    for (const name of ["Data_Dictionary-2024.csv", "notes v2 (final).txt", "a?b.txt", "R&D, Q1+Q2.pdf"]) {
      assertEquals(toStorageFileName(name), name);
    }
  });

  it("replaces each character storage refuses with an underscore", () => {
    assertEquals(toStorageFileName("report#1.txt"), "report_1.txt");
    assertEquals(toStorageFileName("100%.txt"), "100_.txt");
    assertEquals(toStorageFileName("Ärzte.pdf"), "_rzte.pdf");
    assertEquals(toStorageFileName("数据字典.csv"), "____.csv");
    assertEquals(toStorageFileName("[draft] {v2}.md"), "_draft_ _v2_.md");
  });

  it("counts an accented letter as one character, however it was written", () => {
    // "é" as one code point, and as "e" plus a combining accent (as macOS writes it)
    assertEquals(toStorageFileName("café.txt"), "caf_.txt");
    assertEquals(toStorageFileName("café.txt"), "caf_.txt");
  });

  it("always produces a name storage accepts, keeping the extension", () => {
    for (const name of ["Ärzte#1.pdf", "100%.txt", "数据.csv", "a`b~c^d|e\"f<g>h.json", "emoji 😀.md"]) {
      const stored = toStorageFileName(name);
      assertEquals(STORAGE_KEY.test(`datasets/ds-1/${stored}`), true, stored);
      assertEquals(getFileExtension(stored), getFileExtension(name));
    }
  });
});

const defaults = parseResourceUploadConfig(undefined, undefined);
const TYPE_ERROR =
  "This file type isn't supported. Upload a PDF, CSV, JSON, XLSX, DOCX, SQL, MD or TXT file.";

const enc = new TextEncoder();
// Minimal content that passes the content check for each extension.
const validContent = (name: string): Uint8Array => {
  const ext = getFileExtension(name);
  if (ext === "pdf") return enc.encode("%PDF-1.7\n");
  if (ext === "docx") return enc.encode("PK\x03\x04word/document.xml");
  if (ext === "xlsx") return enc.encode("PK\x03\x04xl/workbook.xml");
  return enc.encode("plain text");
};

const check = (name: string, config = defaults, size = 100, content = validContent(name)) =>
  validateResourceFile({ name, size }, config, content);

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

describe("validateResourceFile: content", () => {
  const CORRUPTED = "This file can\u2019t be opened. It may be damaged or saved in a different format. Check the file or choose a different one.";
  const MB = 1024 * 1024;
  const programBytes = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01]);

  it("rejects a file whose content doesn't match its extension", () => {
    assertEquals(check("report.pdf", defaults, 100, enc.encode("not a pdf")), CORRUPTED);
  });

  it("checks the extension before the content", () => {
    assertEquals(check("program.exe", defaults, 6, programBytes), TYPE_ERROR);
  });

  it("reports an empty file as empty, not corrupted", () => {
    assertEquals(check("report.pdf", defaults, 0, new Uint8Array()), "This file is empty.");
  });

  it("reports corrupted content before the size", () => {
    assertEquals(check("report.pdf", defaults, 26 * MB, enc.encode("not a pdf")), CORRUPTED);
  });
});
