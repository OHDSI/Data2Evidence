import pako from "pako";

export interface ConfigStamp {
  configId: string;
  configVersion: string;
}

const COHORT_ROUTE = "/d2e/portal/researcher/cohort";
const LINK_TYPE = "cohort-definition";
const URL_WARN_THRESHOLD = 2048;

/**
 * Extract the active Patient Analytics configuration stamp from getMyConfig,
 * which may return either a list containing one configuration or a bare entry.
 */
export function extractConfigStamp(data: unknown): ConfigStamp | null {
  const entry = Array.isArray(data) ? data[0] : data;
  const meta = (entry as any)?.meta;
  if (!meta?.configId || !meta?.configVersion) {
    return null;
  }
  return {
    configId: String(meta.configId),
    configVersion: String(meta.configVersion),
  };
}

/**
 * Compress an object to a pako-deflated base64url string.
 *
 * Ported verbatim from plugins/ui/apps/wizards/src/utils/cohortUrlCodec.ts,
 * which is documented "Compatible with vue-mri CohortUrlCodec". Both UTF-8
 * encode then deflate with the same pako defaults, so the output is the deep
 * link `query` param the PA loader (vue-mri CohortUrlCodec.safeDecompress)
 * accepts. The explicit byte handling (Array.from -> String.fromCharCode ->
 * btoa) is the part that breaks if mis-ported to Deno, so it is kept exactly.
 *
 * NOTE: this emits base64url (`-`/`_`, no `=`). Do NOT reuse it for the
 * analytics-svc `mriquery` param, which uses standard base64 (`+`/`/`/`=`).
 */
export function compress(obj: unknown): string {
  const jsonString = JSON.stringify(obj);
  const deflated = pako.deflate(new TextEncoder().encode(jsonString));
  const binaryString = Array.from(
    deflated,
    (byte: number) => String.fromCharCode(byte),
  ).join("");
  const base64 = btoa(binaryString);
  // Convert to base64url
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decompress a pako-deflated base64url string back to an object.
 * Inverse of compress(); used by the round-trip oracle test.
 */
export function decompress<T = unknown>(str: string): T {
  // Convert from base64url to base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binaryString = atob(base64);
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
  const inflated = pako.inflate(bytes);
  const jsonString = new TextDecoder().decode(inflated);
  return JSON.parse(jsonString) as T;
}

/** Compress a bookmark and assemble the Patient Analytics cohort deep link. */
export function buildDeepLinkUrl(
  bookmark: unknown,
  datasetId: string,
): { url: string; tooLong: boolean } {
  const query = compress(bookmark);
  const params = new URLSearchParams({ datasetId, linkType: LINK_TYPE });
  const url = `${COHORT_ROUTE}?${params.toString()}&query=${query}`;
  console.log(`Built cohort deep link URL (len=${url.length}): ${url}`);
  return { url, tooLong: url.length > URL_WARN_THRESHOLD };
}
