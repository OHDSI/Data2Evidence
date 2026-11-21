import { afterEach, describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { env } from "../../env.ts";
import {
  getScannerConfig,
  isScanningEnabled,
  parseScanReply,
  ScannerConnection,
  scanFile,
  scanResource,
} from "./resource-upload.scan.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  it("reports unavailable when no host is configured, without connecting", async () => {
    let connected = false;
    const result = await scanFile(new Uint8Array([1]), { ...config, host: "" }, () => {
      connected = true;
      return Promise.reject(new Error("should not connect"));
    });
    assertEquals(result.status, "unavailable");
    assertEquals(connected, false);
  });

  // Review: a scan that loses to the timeout must not keep running.
  it("closes a connection that only opens after the timeout, and sends nothing on it", async () => {
    let writes = 0;
    let closed = false;
    const lateConnect = () =>
      sleep(150).then((): ScannerConnection => ({
        write: (data) => {
          writes++;
          return Promise.resolve(data.length);
        },
        read: () => Promise.resolve(null),
        close: () => {
          closed = true;
        },
      }));

    const result = await scanFile(new Uint8Array([1]), { ...config, timeoutMs: 50 }, lateConnect);
    assertEquals(result.status, "unavailable");
    await sleep(200); // let the late connection arrive
    assertEquals(closed, true);
    assertEquals(writes, 0);
  });

  it("stops sending the file once the scan has timed out", async () => {
    let writes = 0;
    const slowConnection: ScannerConnection = {
      write: async (data) => {
        writes++;
        await sleep(20);
        return data.length;
      },
      read: () => new Promise(() => undefined),
      close: () => undefined,
    };
    // 50 chunks at 20 ms per write would take about two seconds to send.
    const result = await scanFile(new Uint8Array(50 * 64 * 1024), { ...config, timeoutMs: 60 }, () =>
      Promise.resolve(slowConnection)
    );
    assertEquals(result.status, "unavailable");

    await sleep(100); // the write in flight when the timeout fired finishes
    const writesAfterTimeout = writes;
    await sleep(200);
    assertEquals(writes, writesAfterTimeout, "no more chunks are sent after the timeout");
    assert(writes < 20, `only the chunks before the timeout were sent (sent ${writes} writes)`);
  });
});

describe("opt-in scanning", () => {
  const saved = { enabled: env.CLAMAV_ENABLED, host: env.CLAMAV_HOST };
  afterEach(() => {
    env.CLAMAV_ENABLED = saved.enabled;
    env.CLAMAV_HOST = saved.host;
  });

  it("is off unless CLAMAV_ENABLED is true", () => {
    for (const value of [undefined, "", "false", "1", "yes"]) {
      env.CLAMAV_ENABLED = value;
      assertEquals(isScanningEnabled(), false, `CLAMAV_ENABLED=${value}`);
    }
    for (const value of ["true", "TRUE", " true "]) {
      env.CLAMAV_ENABLED = value;
      assertEquals(isScanningEnabled(), true, `CLAMAV_ENABLED=${value}`);
    }
  });

  it("returns not-scanned without contacting a scanner when off", async () => {
    env.CLAMAV_ENABLED = undefined;
    env.CLAMAV_HOST = "clamav";
    assertEquals(await scanResource(new Uint8Array([1])), { status: "not-scanned" });
  });

  it("refuses (unavailable) when on but CLAMAV_HOST is missing: no default host", async () => {
    env.CLAMAV_ENABLED = "true";
    env.CLAMAV_HOST = undefined;
    assertEquals(getScannerConfig().host, "");
    assertEquals((await scanResource(new Uint8Array([1]))).status, "unavailable");
  });
});
