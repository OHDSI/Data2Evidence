import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { parseResourceUploadConfig } from "./resource-upload.config.ts";
import {
  FILE_NAME_MESSAGE,
  getFileExtension,
  isFileNameAllowed,
  nextFreeFileName,
  validateResourceFile,
} from "./resource-upload.validation.ts";

describe("isFileNameAllowed", () => {
  it("accepts English letters, digits, spaces, hyphens, underscores and periods", () => {
    for (const name of [
      "Data_Dictionary-2024.csv", "notes v2.final.txt", "ETL script.sql", "a.md", "notes (final).txt", "abcd (1).pdf",
    ]) {
      assertEquals(isFileNameAllowed(name), true, name);
    }
  });

  it("refuses anything else", () => {
    for (const name of [
      "Ärzte.pdf", "café.txt", "数据.csv", "report#1.txt", "100%.txt", "notes [final].txt", "notes {final}.txt",
      "R&D.pdf", "a?b.txt", "a/b.txt", "a\\b.txt", "emoji 😀.md", "tab\tname.txt", "",
    ]) {
      assertEquals(isFileNameAllowed(name), false, JSON.stringify(name));
    }
  });
});

describe("validateResourceFile: file name", () => {
  it("rejects an unsupported name with the name message", () => {
    assertEquals(
      validateResourceFile({ name: "Ärzte.pdf", size: 10 }, defaults, validContent("x.pdf")),
      FILE_NAME_MESSAGE,
    );
  });

  it("checks the type first, so a wrong type only gets the type error", () => {
    assertEquals(validateResourceFile({ name: "Ärzte.exe", size: 10 }, defaults, enc.encode("x")), TYPE_ERROR);
  });

  it("checks the name before the file is empty, damaged or too large", () => {
    assertEquals(validateResourceFile({ name: "a#b.txt", size: 0 }, defaults, new Uint8Array()), FILE_NAME_MESSAGE);
    assertEquals(
      validateResourceFile({ name: "a#b.txt", size: defaults.maxFileSizeBytes + 1 }, defaults, enc.encode("x")),
      FILE_NAME_MESSAGE,
    );
  });
});

describe("nextFreeFileName", () => {
  it("keeps a free name and numbers a taken one with the lowest free suffix", () => {
    assertEquals(nextFreeFileName("abcd.pdf", []), "abcd.pdf");
    assertEquals(nextFreeFileName("abcd.pdf", ["abcd.pdf"]), "abcd (1).pdf");
    assertEquals(nextFreeFileName("abcd.pdf", ["abcd.pdf", "abcd (1).pdf"]), "abcd (2).pdf");
    assertEquals(nextFreeFileName("abcd.pdf", ["abcd.pdf", "abcd (2).pdf"]), "abcd (1).pdf");
  });

  it("puts the suffix before the extension, even with several dots", () => {
    assertEquals(nextFreeFileName("report.v2.pdf", ["report.v2.pdf"]), "report.v2 (1).pdf");
  });

  it("ignores case in the base name and the extension, keeping the given spelling", () => {
    assertEquals(nextFreeFileName("ABCD.PDF", ["abcd.pdf"]), "ABCD (1).PDF");
    assertEquals(nextFreeFileName("abcd.pdf", ["ABCD.PDF", "Abcd (1).Pdf"]), "abcd (2).pdf");
  });

  it("treats a different extension as a different file", () => {
    assertEquals(nextFreeFileName("abcd.csv", ["abcd.pdf"]), "abcd.csv");
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
