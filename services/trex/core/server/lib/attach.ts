const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const MAX_IDENTIFIER_LEN = 128;

export function isValidIdentifier(s: string): boolean {
  return s.length > 0 && s.length <= MAX_IDENTIFIER_LEN && IDENTIFIER_RE.test(s);
}

const DEFAULT_CACHE_DIR = "./data/cache";

export type ExecFn = (sql: string) => Promise<unknown> | unknown;

export interface AttachOpts {
  cacheDir?: string;
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
  const filePath = `${dir}/${cacheId}.db`;
  if (!fileExists(filePath)) {
    return;
  }
  await opts.exec(`ATTACH IF NOT EXISTS '${filePath}' AS ${cacheId}`);
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
  if (!isValidIdentifier(c.id)) {
    throw new Error(`invalid identifier: ${c.id}`);
  }
  const alias = `${c.id}__srcdb`;
  if (c.dialect === "postgres") {
    const sql =
      `ATTACH IF NOT EXISTS 'host=${c.host} port=${c.port} dbname=${c.name} user=${c.adminUsername} password=${c.adminPassword}' AS ${alias} (TYPE postgres)`;
    await opts.exec(sql);
    return;
  }
  if (c.dialect === "bigquery") {
    const sql =
      `ATTACH IF NOT EXISTS 'project=${c.host} dataset=${c.name}' AS ${alias} (TYPE bigquery, READ_ONLY)`;
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
