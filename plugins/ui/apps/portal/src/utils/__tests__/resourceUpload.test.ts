import { formatFileTypeList, formatMaxFileSize, toAcceptAttribute, validateResourceFile } from "../resourceUpload";

const MB = 1024 * 1024;
const ALL_TYPES = ["pdf", "csv", "json", "xlsx", "docx", "sql", "md", "txt"];

describe("resourceUpload utils", () => {
  describe("toAcceptAttribute", () => {
    it("lists each extension with a leading dot", () => {
      expect(toAcceptAttribute(["pdf", "csv"])).toBe(".pdf,.csv");
    });
  });

  describe("formatFileTypeList", () => {
    it("upper-cases and comma-separates the types", () => {
      expect(formatFileTypeList(ALL_TYPES)).toBe("PDF, CSV, JSON, XLSX, DOCX, SQL, MD, TXT");
    });

    it("joins the last two types with the given word", () => {
      expect(formatFileTypeList(ALL_TYPES, "or")).toBe("PDF, CSV, JSON, XLSX, DOCX, SQL, MD or TXT");
    });

    it("handles one or two types", () => {
      expect(formatFileTypeList(["pdf"], "or")).toBe("PDF");
      expect(formatFileTypeList(["pdf", "csv"], "or")).toBe("PDF or CSV");
    });
  });

  describe("formatMaxFileSize", () => {
    it("shows whole megabytes without decimals", () => {
      expect(formatMaxFileSize(25 * MB)).toBe("25 MB");
    });

    it("shows one decimal for other limits", () => {
      expect(formatMaxFileSize(MB / 2)).toBe("0.5 MB");
      expect(formatMaxFileSize(Math.floor(2.25 * MB))).toBe("2.3 MB");
    });
  });
});

describe("validateResourceFile", () => {
  const config = { allowedExtensions: ALL_TYPES, maxFileSizeBytes: 25 * MB };
  // jsdom has no TextEncoder; the test strings are plain ASCII.
  const enc = { encode: (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0)) };
  // Minimal content that passes the content check for each extension.
  const validContent = (name: string): Uint8Array => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return enc.encode("%PDF-1.7\n");
    if (ext === "docx") return enc.encode("PK\x03\x04word/document.xml");
    if (ext === "xlsx") return enc.encode("PK\x03\x04xl/workbook.xml");
    return enc.encode("plain text");
  };
  const check = (name: string, size = 100, content = validContent(name)) =>
    validateResourceFile({ name, size }, config, content);

  it("accepts allowed extensions in any case", () => {
    expect(check("data.CSV")).toBeUndefined();
    expect(check("report.Pdf")).toBeUndefined();
  });

  it.each(["a.exe", "a.sh", "a.bat", "a.js", "a.html", "a.R", "a.EXE", "report.pdf.exe", "Makefile", ".env"])(
    "rejects %s as the wrong type",
    (name) => {
      expect(check(name)).toBe("type");
    }
  );

  it("rejects an empty file", () => {
    expect(check("notes.txt", 0)).toBe("empty");
  });

  it("accepts a file of exactly the limit and rejects one byte more", () => {
    expect(check("data.csv", 25 * MB)).toBeUndefined();
    expect(check("data.csv", 25 * MB + 1)).toBe("size");
  });

  it("checks the type first, so a wrong type never gets a size error", () => {
    expect(check("program.exe", 0)).toBe("type");
    expect(check("program.exe", 26 * MB)).toBe("type");
  });

  it("rejects content that doesn't match the extension as corrupted", () => {
    expect(check("report.pdf", 100, enc.encode("not a pdf"))).toBe("corrupted");
    expect(check("notes.txt", 100, new Uint8Array([0x4d, 0x5a, 0, 0]))).toBe("corrupted");
  });

  it("reports empty before corrupted, and corrupted before too large", () => {
    expect(check("report.pdf", 0, new Uint8Array())).toBe("empty");
    expect(check("report.pdf", 26 * MB, enc.encode("not a pdf"))).toBe("corrupted");
  });
});
