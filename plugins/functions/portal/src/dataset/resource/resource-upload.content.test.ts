import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { isContentValid, isProgram, isText } from "./resource-upload.content.ts";

const enc = new TextEncoder();
const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...enc.encode(p)] : p)));
const utf16le = (s: string) => [...s].flatMap((c) => [c.charCodeAt(0), 0]);
const utf16be = (s: string) => [...s].flatMap((c) => [0, c.charCodeAt(0)]);
const utf32le = (s: string) => [...s].flatMap((c) => [c.charCodeAt(0), 0, 0, 0]);
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

// Headers of a Windows program (MZ pointing at "PE\0\0") with "%PDF-" in its stub.
const windowsProgram = () => {
  const b = new Uint8Array(256);
  b.set(enc.encode("MZ"), 0);
  b.set([0x80, 0, 0, 0], 0x3c);
  b.set(enc.encode("%PDF-"), 0x40);
  b.set(enc.encode("PE\0\0"), 0x80);
  return b;
};

describe("isProgram", () => {
  it("recognises Windows, Linux and macOS programs", () => {
    assertEquals(isProgram(windowsProgram()), true);
    assertEquals(isProgram(bytes([0x7f], "ELF", [2, 1])), true);
    assertEquals(isProgram(bytes([0xcf, 0xfa, 0xed, 0xfe, 7, 0])), true);
  });

  it("doesn't flag text that merely starts with MZ", () => {
    assertEquals(isProgram(bytes("MZ_region,population\nNorth,1200\n")), false);
  });
});

describe("isText", () => {
  it("accepts 8-bit text such as UTF-8 and Windows-1252", () => {
    assertEquals(isText(bytes("naïve café\n")), true);
    assertEquals(isText(bytes("Ren", [0xe9], ",Z", [0xfc], "rich\n")), true);
  });

  it("rejects any null byte in 8-bit text", () => {
    assertEquals(isText(bytes("Bo", [0], "b\n")), false);
  });

  it("accepts UTF-16 and UTF-32 with a byte order mark", () => {
    assertEquals(isText(bytes([0xff, 0xfe], utf16le("id,name\n"))), true);
    assertEquals(isText(bytes([0xfe, 0xff], utf16be("notes\n"))), true);
    assertEquals(isText(bytes([0xff, 0xfe, 0, 0], utf32le("notes\n"))), true);
  });

  it("rejects UTF-16/32 with a null character or a broken length", () => {
    assertEquals(isText(bytes([0xff, 0xfe], utf16le("ab"), [0, 0], utf16le("cd"))), false);
    assertEquals(isText(bytes([0xff, 0xfe], utf16le("ab"), [0x41])), false);
    assertEquals(isText(bytes([0xff, 0xfe, 0, 0], utf32le("a"), [0, 0, 0, 0])), false);
  });

  it("accepts null bytes padding the end of 8-bit text, but nowhere else", () => {
    assertEquals(isText(bytes("id,name\n1,Ann\n", [0, 0, 0, 0])), true);
    assertEquals(isText(bytes("Bo", [0], "b\n", [0, 0])), false);
    assertEquals(isText(bytes([0, 0, 0])), false);
    assertEquals(isText(bytes("MZ", new Array(510).fill(0))), false); // mostly nulls
  });

  it("accepts UTF-16 without a byte order mark", () => {
    assertEquals(isText(bytes(utf16le("id,name\n1,Ann\n"))), true);
    assertEquals(isText(bytes(utf16be("id,name\n1,Ann\n"))), true);
    // U+4E00 ("一") is stored as 00 4E, a zero in the other position.
    assertEquals(isText(bytes(utf16le("id,"), [0x00, 0x4e], utf16le("\n"))), true);
  });

  it("rejects binary data that only looks a little like UTF-16", () => {
    assertEquals(isText(bytes(utf16le("ab"), [0, 0], utf16le("cd"))), false); // null character
    assertEquals(isText(bytes(utf16le("ab"), [0x41])), false); // odd length
    assertEquals(isText(bytes([1, 2, 3, 0, 5, 6, 7, 8, 9, 10])), false); // too few zero bytes
    assertEquals(isContentValid(bytes([0x1f, 0x8b, 0x08, 0x00, 0, 0, 0, 0, 0, 0x03, 0x4b, 0x4c, 0x4a, 0x06, 0x00]), "csv"), false); // gzip
  });
});

describe("isContentValid", () => {
  it("accepts a PDF header anywhere in the first 1 KB", () => {
    assertEquals(isContentValid(bytes("%PDF-1.7\n"), "pdf"), true);
    assertEquals(isContentValid(bytes(" ".repeat(1000), "%PDF-1.4"), "pdf"), true);
  });

  it("rejects a PDF without a header in the first 1 KB", () => {
    assertEquals(isContentValid(bytes("plain text"), "pdf"), false);
    assertEquals(isContentValid(bytes(" ".repeat(2000), "%PDF-1.4"), "pdf"), false);
  });

  it("rejects a program even when it hides a PDF header", () => {
    assertEquals(isContentValid(windowsProgram(), "pdf"), false);
  });

  it("accepts a DOCX/XLSX zip only with the matching folder inside", () => {
    assertEquals(isContentValid(bytes("PK\x03\x04", "word/document.xml"), "docx"), true);
    assertEquals(isContentValid(bytes("PK\x03\x04", "xl/workbook.xml"), "xlsx"), true);
    assertEquals(isContentValid(bytes("PK\x03\x04", "photos/a.jpg"), "docx"), false);
    assertEquals(isContentValid(bytes("PK\x03\x04", "word/document.xml"), "xlsx"), false);
  });

  it("accepts password-protected and old-format Office files", () => {
    assertEquals(isContentValid(bytes(OLE, utf16le("EncryptedPackage")), "docx"), true);
    assertEquals(isContentValid(bytes(OLE, utf16le("EncryptedPackage")), "xlsx"), true);
    assertEquals(isContentValid(bytes(OLE, utf16le("WordDocument")), "docx"), true);
    assertEquals(isContentValid(bytes(OLE, utf16le("Workbook")), "xlsx"), true);
  });

  it("rejects other files in the Office container format, such as installers", () => {
    assertEquals(isContentValid(bytes(OLE, utf16le("SummaryInformation")), "docx"), false);
    assertEquals(isContentValid(bytes(OLE, utf16le("WordDocument")), "xlsx"), false);
  });

  it("applies the text rule to every text type", () => {
    for (const ext of ["csv", "txt", "md", "sql", "json"]) {
      assertEquals(isContentValid(bytes("a,b\n1,2\n"), ext), true, ext);
      assertEquals(isContentValid(bytes("MZ", [0, 0, 0], "x"), ext), false, ext);
    }
  });

  it("treats an empty file as matching (emptiness is reported separately)", () => {
    assertEquals(isContentValid(new Uint8Array(), "pdf"), true);
  });
});
