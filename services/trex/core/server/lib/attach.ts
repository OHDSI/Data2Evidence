const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const MAX_IDENTIFIER_LEN = 128;
// `${id}__srcdb` must also fit within MAX_IDENTIFIER_LEN; reserve the suffix length.
const SRCDB_SUFFIX = "__srcdb";
const MAX_SOURCE_ID_LEN = MAX_IDENTIFIER_LEN - SRCDB_SUFFIX.length;

export function isValidIdentifier(s: string): boolean {
  return s.length > 0 && s.length <= MAX_IDENTIFIER_LEN && IDENTIFIER_RE.test(s);
}

// Escape a single value for safe inclusion inside a single-quoted SQL string.
function sqlQuote(s: string): string {
  return s.replace(/'/g, "''");
}

const DEFAULT_CACHE_DIR = "./data/cache";

export type ExecFn = (sql: string) => Promise<unknown> | unknown;

export interface AttachOpts {
  cacheDir?: string;
  createDbFileIfMissing?: boolean;
  exec: ExecFn;
}

function fileExists(p: string): boolean {
  try {
    return Deno.statSync(p).isFile;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return false;
    throw e;
  }
}

export async function ensureCacheAttached(
  cacheId: string,
  opts: AttachOpts,
): Promise<void> {
  if (!isValidIdentifier(cacheId)) {
    throw new Error(`invalid identifier: ${cacheId}`);
  }
  const dir = opts.cacheDir ?? DEFAULT_CACHE_DIR;
  const createDbFileIfMissing = opts.createDbFileIfMissing ?? false;
  const filePath = `${dir}/${cacheId}.db`;
  if (!fileExists(filePath) && !createDbFileIfMissing) {
    return;
  }
  const attachSql = `ATTACH IF NOT EXISTS '${filePath}' AS ${cacheId}`;
  await opts.exec(attachSql);
}

export interface SourceCredential {
  id: string;
  dialect: "postgres" | "bigquery" | string;
  host: string;
  port?: number;
  name: string;
  adminUsername: string;
  adminPassword: string;
}

export async function ensureSourceAttached(
  c: SourceCredential,
  opts: { exec: ExecFn },
): Promise<void> {
  if (!isValidIdentifier(c.id) || c.id.length > MAX_SOURCE_ID_LEN) {
    throw new Error(`invalid identifier: ${c.id}`);
  }
  const alias = `${c.id}${SRCDB_SUFFIX}`;
  if (c.dialect === "postgres") {
    // Credentials are quote-escaped because they're interpolated inside the
    // single-quoted DuckDB ATTACH connection string. Identifier alias is
    // already validated above.
    const host = sqlQuote(c.host);
    const name = sqlQuote(c.name);
    const user = sqlQuote(c.adminUsername);
    const password = sqlQuote(c.adminPassword);
    const sql =
      `ATTACH IF NOT EXISTS 'host=${host} port=${c.port} dbname=${name} user=${user} password=${password}' AS ${alias} (TYPE postgres)`;
    await opts.exec(sql);
    return;
  }
  if (c.dialect === "bigquery") {
    const host = sqlQuote(c.host);
    const name = sqlQuote(c.name);
    const sql =
      `ATTACH IF NOT EXISTS 'project=${host} dataset=${name}' AS ${alias} (TYPE bigquery, READ_ONLY)`;
    await opts.exec(sql);
    return;
  }
  // Unsupported dialect: nothing to attach; skip silently.
}

export interface EnsureAttachedInput {
  connections?: SourceCredential[];
  cacheIds?: string[];
}

export async function ensureAttached(
  input: EnsureAttachedInput,
  opts: AttachOpts,
): Promise<void> {
  for (const c of input.connections ?? []) {
    await ensureSourceAttached(c, { exec: opts.exec });
  }
  for (const cid of input.cacheIds ?? []) {
    await ensureCacheAttached(cid, opts);
  }
}
