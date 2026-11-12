import { env } from "../../env.ts";

// Malware scanning through a ClamAV daemon (clamd), using its INSTREAM
// protocol: send "zINSTREAM\0", then the file as length-prefixed chunks, then
// a zero-length chunk; clamd replies "stream: OK" or "stream: <name> FOUND".
// https://docs.clamav.net/manual/Usage/Scanning.html#instream

// Shown when a scan blocks or can't scan an upload. English only, like other
// portal API errors; the Add file dialog shows its own translated messages.
export const BLOCKED_MESSAGE =
  "This file is blocked. We found a possible security threat, so it wasn\u2019t uploaded. Check the file or choose a different one.";
export const SCAN_UNAVAILABLE_MESSAGE =
  "We couldn\u2019t check this file for security threats right now, so it can\u2019t be uploaded. Please try again later.";

export type ScanResult =
  | { status: "clean" }
  | { status: "infected"; signature: string }
  | { status: "unavailable"; reason: string };

export interface ScannerConfig {
  host: string;
  port: number;
  timeoutMs: number;
}

const CHUNK_SIZE = 64 * 1024;

export const getScannerConfig = (): ScannerConfig => ({
  host: env.CLAMAV_HOST || "localhost",
  port: Number(env.CLAMAV_PORT) || 3310,
  timeoutMs: Number(env.CLAMAV_TIMEOUT_MS) || 60_000,
});

const lengthPrefix = (length: number): Uint8Array => {
  const prefix = new Uint8Array(4);
  new DataView(prefix.buffer).setUint32(0, length); // big-endian, as clamd expects
  return prefix;
};

// Interprets clamd's reply. Anything other than a clear OK or FOUND is
// treated as "unavailable", so the caller fails closed.
export const parseScanReply = (reply: string): ScanResult => {
  const text = reply.replace(/\0/g, "").trim();
  if (text === "stream: OK") return { status: "clean" };
  const found = text.match(/^stream: (.+) FOUND$/);
  if (found) return { status: "infected", signature: found[1] };
  return { status: "unavailable", reason: `Unexpected scanner reply: ${text || "(empty)"}` };
};

// Minimal connection shape, so tests can supply a fake scanner.
export interface ScannerConnection {
  write(data: Uint8Array): Promise<number>;
  read(buffer: Uint8Array): Promise<number | null>;
  close(): void;
}

export type Connect = (host: string, port: number) => Promise<ScannerConnection>;

const denoConnect: Connect = (hostname, port) => Deno.connect({ hostname, port });

const writeAll = async (conn: ScannerConnection, data: Uint8Array) => {
  let written = 0;
  while (written < data.length) {
    written += await conn.write(data.subarray(written));
  }
};

const streamToScanner = async (conn: ScannerConnection, content: Uint8Array): Promise<string> => {
  await writeAll(conn, new TextEncoder().encode("zINSTREAM\0"));
  for (let offset = 0; offset < content.length; offset += CHUNK_SIZE) {
    const chunk = content.subarray(offset, offset + CHUNK_SIZE);
    await writeAll(conn, lengthPrefix(chunk.length));
    await writeAll(conn, chunk);
  }
  await writeAll(conn, lengthPrefix(0));

  // The reply is short and ends with "\0"; read until then or the connection closes.
  const decoder = new TextDecoder();
  const buffer = new Uint8Array(1024);
  let reply = "";
  while (!reply.includes("\0")) {
    const read = await conn.read(buffer);
    if (read === null) break;
    reply += decoder.decode(buffer.subarray(0, read));
  }
  return reply;
};

// Scans the file with ClamAV. Never throws: connection failures, timeouts
// and unexpected replies come back as "unavailable".
export const scanFile = async (
  content: Uint8Array,
  config: ScannerConfig = getScannerConfig(),
  connect: Connect = denoConnect,
): Promise<ScanResult> => {
  let conn: ScannerConnection | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Scan timed out after ${config.timeoutMs} ms`)), config.timeoutMs);
    });
    const scan = (async () => {
      conn = await connect(config.host, config.port);
      return parseScanReply(await streamToScanner(conn, content));
    })();
    return await Promise.race([scan, timeout]);
  } catch (error) {
    return { status: "unavailable", reason: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
    try {
      conn?.close();
    } catch {
      // Already closed.
    }
  }
};
