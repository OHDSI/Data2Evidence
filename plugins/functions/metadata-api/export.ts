// @ts-nocheck - Deno edge function (trex EdgeRuntime).
// Pure helpers for exporting a hades results DB as a gzipped object.

/** Gzip-compress bytes using the platform CompressionStream. */
export async function gzipBytes(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Locate the results DB inside a hades run dir. With `override`, return that
 * file if it exists (else null). Otherwise return the largest non-`spec.json`
 * file — the hades results DuckDB database.
 */
export async function findResultsDb(dir: string, override?: string): Promise<string | null> {
  if (override) {
    const p = `${dir}/${override}`;
    try {
      const st = await Deno.stat(p);
      return st.isFile ? p : null;
    } catch {
      return null;
    }
  }
  let best: { path: string; size: number } | null = null;
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (!entry.isFile || entry.name === "spec.json") continue;
      const st = await Deno.stat(`${dir}/${entry.name}`);
      if (!best || st.size > best.size) best = { path: `${dir}/${entry.name}`, size: st.size };
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return null;
    throw e;
  }
  return best?.path ?? null;
}

/** PUT bytes to a presigned URL; returns the response ETag (may be empty). */
export async function putToUrl(url: string, bytes: Uint8Array): Promise<string> {
  const res = await fetch(url, {
    method: "PUT",
    body: bytes,
    headers: { "content-type": "application/gzip" },
  });
  if (!res.ok) throw new Error(`upload PUT failed: ${res.status}`);
  const etag = res.headers.get("etag") ?? "";
  await res.body?.cancel();
  return etag;
}
