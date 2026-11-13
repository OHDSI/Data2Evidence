import { isContentValid, isProgram, isText } from "../resourceContent";

// The same rules as the backend (resource-upload.content.test.ts); these
// cover the frontend copy so the two can't drift unnoticed.
// jsdom has no TextEncoder; the test strings are plain ASCII.
const enc = { encode: (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0)) };
const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? Array.from(enc.encode(p)) : p)));
const utf16le = (s: string) => Array.from(s).flatMap((c) => [c.charCodeAt(0), 0]);
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

const windowsProgram = () => {
  const b = new Uint8Array(256);
  b.set(enc.encode("MZ"), 0);
  b.set([0x80, 0, 0, 0], 0x3c);
  b.set(enc.encode("%PDF-"), 0x40);
  b.set(enc.encode("PE\0\0"), 0x80);
  return b;
};

describe("resourceContent", () => {
  it("recognises programs but not text that starts with MZ", () => {
    expect(isProgram(windowsProgram())).toBe(true);
    expect(isProgram(bytes([0x7f], "ELF", [2, 1]))).toBe(true);
    expect(isProgram(bytes("MZ_region,population\n"))).toBe(false);
  });

  it("accepts 8-bit, UTF-16 and UTF-32 text and rejects null characters", () => {
    expect(isText(bytes("Ren", [0xe9], "\n"))).toBe(true);
    expect(isText(bytes([0xff, 0xfe], utf16le("id,name\n")))).toBe(true);
    expect(isText(bytes([0xff, 0xfe, 0, 0], [0x61, 0, 0, 0]))).toBe(true);
    expect(isText(bytes("Bo", [0], "b\n"))).toBe(false);
    expect(isText(bytes([0xff, 0xfe], utf16le("a"), [0, 0]))).toBe(false);
  });

  it("accepts trailing null padding and UTF-16 without a byte order mark", () => {
    expect(isText(bytes("id,name\n", [0, 0, 0]))).toBe(true);
    expect(isText(bytes("Bo", [0], "b\n", [0, 0]))).toBe(false);
    expect(isText(bytes([0, 0, 0]))).toBe(false);
    expect(isText(bytes("MZ", new Array(510).fill(0)))).toBe(false);
    expect(isText(bytes(utf16le("id,name\n1,Ann\n")))).toBe(true);
    expect(isText(bytes(utf16le("id,"), [0x00, 0x4e], utf16le("\n")))).toBe(true);
    expect(isText(bytes(utf16le("ab"), [0, 0], utf16le("cd")))).toBe(false);
    expect(isText(bytes([1, 2, 3, 0, 5, 6, 7, 8, 9, 10]))).toBe(false);
  });

  it("checks PDFs, including a program hiding a PDF header", () => {
    expect(isContentValid(bytes(" ".repeat(1000), "%PDF-1.4"), "pdf")).toBe(true);
    expect(isContentValid(bytes(" ".repeat(2000), "%PDF-1.4"), "pdf")).toBe(false);
    expect(isContentValid(windowsProgram(), "pdf")).toBe(false);
  });

  it("checks DOCX/XLSX zips and the older Office container", () => {
    expect(isContentValid(bytes("PK\x03\x04", "word/document.xml"), "docx")).toBe(true);
    expect(isContentValid(bytes("PK\x03\x04", "photos/a.jpg"), "docx")).toBe(false);
    expect(isContentValid(bytes(OLE, utf16le("EncryptedPackage")), "xlsx")).toBe(true);
    expect(isContentValid(bytes(OLE, utf16le("Workbook")), "xlsx")).toBe(true);
    expect(isContentValid(bytes(OLE, utf16le("SummaryInformation")), "docx")).toBe(false);
  });
});
