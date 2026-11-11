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
  const config = { allowedExtensions: ALL_TYPES };

  it("accepts allowed extensions in any case", () => {
    expect(validateResourceFile({ name: "data.CSV" }, config)).toBeUndefined();
    expect(validateResourceFile({ name: "report.Pdf" }, config)).toBeUndefined();
  });

  it.each(["a.exe", "a.sh", "a.bat", "a.js", "a.html", "a.R", "a.EXE", "report.pdf.exe", "Makefile", ".env"])(
    "rejects %s as the wrong type",
    (name) => {
      expect(validateResourceFile({ name }, config)).toBe("type");
    }
  );
});
