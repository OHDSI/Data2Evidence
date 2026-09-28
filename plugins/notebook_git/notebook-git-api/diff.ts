// @ts-nocheck - Deno edge function (trex EdgeRuntime).
// notebook.document.content is JSONB and Postgres does not preserve key order,
// so a string compare (what the React notebook.service.ts does, where the
// column is TEXT) reports spurious drift. Compare canonically instead.

/** Stable JSON: object keys sorted recursively, array order preserved. */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** Parse either side if it is a JSON string, then compare canonically. */
export function contentEquals(a: unknown, b: unknown): boolean {
  const pa = coerce(a);
  const pb = coerce(b);
  if (pa === undefined || pb === undefined) return false;
  return canonicalize(pa) === canonicalize(pb);
}

// Returns undefined for an unparseable string, so contentEquals reports false
// rather than comparing a raw string against an object.
function coerce(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
