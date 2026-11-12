import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { parseScanReply, ScannerConnection, scanFile } from "./resource-upload.scan.ts";

const config = { host: "clamav", port: 3310, timeoutMs: 200 };

// A fake clamd that records what it was sent and answers with `reply`.
const fakeScanner = (reply: string | null, options: { hang?: boolean } = {}) => {
  const received: number[] = [];
  let closed = false;
  const connection: ScannerConnection = {
    write: (data) => {
      received.push(...data);
      return Promise.resolve(data.length);
    },
    read: (buffer) => {
      if (options.hang) return new Promise(() => undefined);
      if (reply === null) return Promise.resolve(null);
      const bytes = new TextEncoder().encode(reply);
      buffer.set(bytes);
      reply = null;
      return Promise.resolve(bytes.length);
    },
    close: () => {
      closed = true;
    },
  };
  return {
    connect: () => Promise.resolve(connection),
    received: () => new Uint8Array(received),
    closed: () => closed,
  };
};

describe("parseScanReply", () => {
  it("reads clean and infected replies", () => {
    assertEquals(parseScanReply("stream: OK\0"), { status: "clean" });
    assertEquals(parseScanReply("stream: Eicar-Test-Signature FOUND\0"), {
      status: "infected",
      signature: "Eicar-Test-Signature",
    });
  });

  it("treats anything else as unavailable, so uploads fail closed", () => {
    assertEquals(parseScanReply("INSTREAM size limit exceeded. ERROR\0").status, "unavailable");
    assertEquals(parseScanReply("").status, "unavailable");
  });
});

describe("scanFile", () => {
  it("sends the file using the INSTREAM protocol", async () => {
    const scanner = fakeScanner("stream: OK\0");
    await scanFile(new TextEncoder().encode("abc"), config, scanner.connect);

    const expected = new Uint8Array([
      ...new TextEncoder().encode("zINSTREAM\0"),
      0, 0, 0, 3, ...new TextEncoder().encode("abc"),
      0, 0, 0, 0,
    ]);
    assertEquals(scanner.received(), expected);
    assertEquals(scanner.closed(), true);
  });

  it("splits a large file into 64 KB chunks", async () => {
    const scanner = fakeScanner("stream: OK\0");
    await scanFile(new Uint8Array(65 * 1024), config, scanner.connect);

    const sent = scanner.received();
    const view = new DataView(sent.buffer);
    assertEquals(view.getUint32(10), 64 * 1024);
    assertEquals(view.getUint32(10 + 4 + 64 * 1024), 1024);
  });

  it("reports infected files with the signature name", async () => {
    const result = await scanFile(new Uint8Array([1]), config, fakeScanner("stream: Win.Test FOUND\0").connect);
    assertEquals(result, { status: "infected", signature: "Win.Test" });
  });

  it("reports unavailable when the scanner can't be reached", async () => {
    const result = await scanFile(new Uint8Array([1]), config, () => Promise.reject(new Error("connection refused")));
    assertEquals(result, { status: "unavailable", reason: "connection refused" });
  });

  it("reports unavailable when the scanner doesn't answer in time", async () => {
    const scanner = fakeScanner("stream: OK\0", { hang: true });
    const result = await scanFile(new Uint8Array([1]), config, scanner.connect);
    assertEquals(result.status, "unavailable");
    assertEquals(scanner.closed(), true);
  });
});
