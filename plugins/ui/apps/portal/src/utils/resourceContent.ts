// Checks that a file's bytes match its extension, so a renamed file (e.g. a
// program saved as .pdf) is rejected. Each allowed type has its own rule; any
// file that starts like a program is rejected whatever its extension.
// Mirrors plugins/functions/portal/src/dataset/resource/resource-upload.content.ts; keep both in sync.

const TEXT_EXTENSIONS = new Set(["csv", "txt", "md", "sql", "json"]);

// PDF readers accept the "%PDF-" header anywhere in the first 1 KB.
const PDF_HEADER_WINDOW = 1024;

const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"
// Microsoft's older container format, used by password-protected Office
// files and old .doc/.xls (but also by installers, hence the stream checks).
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0): boolean =>
  bytes.length >= offset + signature.length && signature.every((value, i) => bytes[offset + i] === value);

const indexOfBytes = (bytes: Uint8Array, needle: number[], end = bytes.length): number => {
  const last = Math.min(end, bytes.length) - needle.length;
  for (let i = 0; i <= last; i++) {
    if (bytes[i] === needle[0] && needle.every((value, j) => bytes[i + j] === value)) return i;
  }
  return -1;
};

const ascii = (text: string): number[] => [...text].map((c) => c.charCodeAt(0));
// Stream names inside the Office container are stored as UTF-16LE.
const utf16le = (text: string): number[] => [...text].flatMap((c) => [c.charCodeAt(0), 0]);

const containsAny = (bytes: Uint8Array, needles: number[][]): boolean =>
  needles.some((needle) => indexOfBytes(bytes, needle) >= 0);

// Windows (MZ header pointing at "PE\0\0"), Linux (ELF) and macOS (Mach-O) programs.
export const isProgram = (bytes: Uint8Array): boolean => {
  if (startsWith(bytes, [0x4d, 0x5a]) && bytes.length >= 64) {
    const peOffset = (bytes[60] | (bytes[61] << 8) | (bytes[62] << 16) | (bytes[63] << 24)) >>> 0;
    if (startsWith(bytes, [0x50, 0x45, 0x00, 0x00], peOffset)) return true;
  }
  return [
    [0x7f, 0x45, 0x4c, 0x46], // ELF
    [0xfe, 0xed, 0xfa, 0xce], // Mach-O 32-bit
    [0xfe, 0xed, 0xfa, 0xcf], // Mach-O 64-bit
    [0xce, 0xfa, 0xed, 0xfe], // Mach-O 32-bit, little-endian
    [0xcf, 0xfa, 0xed, 0xfe], // Mach-O 64-bit, little-endian
    [0xca, 0xfe, 0xba, 0xbe], // Mach-O universal (also Java class files)
  ].some((signature) => startsWith(bytes, signature));
};

// True when every unitSize-byte character after the byte order mark is
// non-zero, i.e. there is no null character.
const hasNoNullUnits = (bytes: Uint8Array, unitSize: number): boolean => {
  if (bytes.length % unitSize !== 0) return false;
  for (let i = unitSize; i < bytes.length; i += unitSize) {
    let allZero = true;
    for (let j = 0; j < unitSize; j++) {
      if (bytes[i + j] !== 0) {
        allZero = false;
        break;
      }
    }
    if (allZero) return false;
  }
  return true;
};

// Plain text in any 8-bit encoding (UTF-8, Windows-1252, ...) has no null
// bytes. UTF-16 and UTF-32 are recognised by their byte order mark and may
// not contain null characters. UTF-32 marks are checked first because the
// UTF-32LE mark starts with the UTF-16LE one.
export const isText = (bytes: Uint8Array): boolean => {
  if (startsWith(bytes, [0xff, 0xfe, 0x00, 0x00]) || startsWith(bytes, [0x00, 0x00, 0xfe, 0xff])) {
    return hasNoNullUnits(bytes, 4);
  }
  if (startsWith(bytes, [0xff, 0xfe]) || startsWith(bytes, [0xfe, 0xff])) {
    return hasNoNullUnits(bytes, 2);
  }
  return !bytes.includes(0);
};

const isPdf = (bytes: Uint8Array): boolean => indexOfBytes(bytes, ascii("%PDF-"), PDF_HEADER_WINDOW + 5) >= 0;

const isOfficeFile = (bytes: Uint8Array, zipFolder: string, oldFormatStreams: string[]): boolean => {
  if (startsWith(bytes, ZIP_SIGNATURE)) {
    return indexOfBytes(bytes, ascii(zipFolder)) >= 0;
  }
  if (startsWith(bytes, OLE_SIGNATURE)) {
    // Password-protected files keep their content in "EncryptedPackage".
    return containsAny(bytes, ["EncryptedPackage", ...oldFormatStreams].map(utf16le));
  }
  return false;
};

// True when the file's content matches its (lower-case) extension. An empty
// file counts as matching; emptiness is reported separately.
export const isContentValid = (bytes: Uint8Array, extension: string): boolean => {
  if (bytes.length === 0) return true;
  if (isProgram(bytes)) return false;
  if (TEXT_EXTENSIONS.has(extension)) return isText(bytes);
  switch (extension) {
    case "pdf":
      return isPdf(bytes);
    case "docx":
      return isOfficeFile(bytes, "word/", ["WordDocument"]);
    case "xlsx":
      return isOfficeFile(bytes, "xl/", ["Workbook", "Book"]);
    default:
      return false;
  }
};
