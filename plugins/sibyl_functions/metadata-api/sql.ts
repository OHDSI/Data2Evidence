// @ts-nocheck - Deno edge function, runs in trex's EdgeRuntime (not tsc-compiled)
//
// The ONE module that knows how a function worker reaches trex's DuckDB engine
// (where the hades.trex extension is loaded). Source of truth:
// docs/superpowers/notes/2026-05-31-hades-spike.md -> "SQL TRANSPORT RESOLUTION",
// confirmed against the gold-standard /Users/ph/code/trex/plugins/devx/functions/duckdb.ts.
//
// All hades columns come back as strings; scalar hades_* functions return a JSON
// string in a single cell (callers JSON.parse it).
//
// `Trex` is a global injected by the EdgeRuntime host (no import; @ts-nocheck).
// `getConnection("memory","main","main","main",{})` targets the default in-memory
// DuckDB where hades lives. `.execute(sql, params)` returns the rows array directly.

export interface QueryResult {
  rows: Record<string, unknown>[];
}

// getConnection() logs a harmless "Error getting dialect for memory" at error level
// while resolving credentials for the in-memory db. Filter just that one line, once at
// module load — NOT per query. A per-call save/restore of the global console.error
// races across concurrent requests in a shared worker: one request can swallow another's
// real errors, or restore a stale handler. Idempotent so repeated evaluation (or a
// sibling *-api sql module) doesn't stack filters.
if (!(console.error as any).__memDialectFiltered) {
  const origError = console.error;
  const filtered = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("Error getting dialect for memory")) return;
    origError.apply(console, args);
  };
  (filtered as any).__memDialectFiltered = true;
  console.error = filtered;
}

export async function query(sql: string, params?: unknown[]): Promise<QueryResult> {
  const dbm = (globalThis as any).Trex?.databaseManager?.();
  if (!dbm) {
    throw new Error("Trex.databaseManager unavailable in this worker (see spike note)");
  }

  const conn = dbm.getConnection("memory", "main", "main", "main", {});
  const result = await conn.connection.execute(sql, params ?? []);
  const rows = normalizeRows(result);
  return { rows };
}

// normalizeRows(): coerce the engine's result into Record<string,unknown>[].
function normalizeRows(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  const r = raw as { rows?: unknown[] } | null;
  return (r?.rows ?? []) as Record<string, unknown>[];
}

// SQL literal escaping (single-quote doubling) — used by builders.
export function lit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
