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
  dialect: "postgres" | "bigquery" | "snowflake" | string;
  host: string;
  port?: number;
  name: string;
  adminUsername: string;
  adminPassword: string;
  // Snowflake key-pair extras (all from db_extra.Internal, mirroring how BigQuery
  // stores its long service-account key). adminUsername = Snowflake user; the PEM
  // private key is `privateKey` (NOT adminPassword — a PEM is too long for the
  // RSA-encrypted, 420-char-capped credential store).
  warehouse?: string;
  schema?: string;
  role?: string;
  privateKey?: string;
  privateKeyPassphrase?: string;
}

// Pulls Snowflake-specific extras out of a decrypted trex.db row's db_extra (jsonb).
// db_extra stores the Internal object's CONTENTS directly — dbm.ts persists
// JSON.stringify(c.extra?.Internal), and PrefectAPI.ts reads db_extra.<field> directly.
export function snowflakeExtrasFromRow(dbExtra: unknown): Pick<
  SourceCredential,
  "warehouse" | "schema" | "role" | "privateKey" | "privateKeyPassphrase"
> {
  // db_extra is a jsonb column. Depending on the pg type parser in this runtime it
  // may arrive already-parsed (object) or as a raw JSON string — normalize both.
  let extra: any = dbExtra ?? {};
  if (typeof extra === "string") {
    try { extra = JSON.parse(extra || "{}"); } catch { extra = {}; }
  }
  return {
    warehouse: extra.warehouse,
    schema: extra.schema,
    role: extra.role,
    privateKey: extra.privateKey,
    privateKeyPassphrase: extra.privateKeyPassphrase,
  };
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
    const datasetClause = c.name ? ` dataset=${sqlQuote(c.name)}` : "";
    const sql =
      `ATTACH IF NOT EXISTS 'project=${host}${datasetClause}' AS ${alias} (TYPE bigquery, READ_ONLY)`;
    await opts.exec(sql);
    return;
  }
  if (c.dialect === "snowflake") {
    // Confirmed against iqea-ai/duckdb-snowflake extension docs (community extension):
    // key-pair auth requires AUTH_TYPE 'key_pair' explicitly; PRIVATE_KEY is the PEM
    // key content (not a file path in this usage). ROLE is included as an optional
    // parameter — not explicitly documented but accepted by the extension.
    // The PEM private key comes from db_extra (c.privateKey); adminUsername = Snowflake user.
    if (!c.privateKey) {
      throw new Error(`snowflake key-pair auth requires a private key for ${c.id}`);
    }
    // The community snowflake extension is not autoloaded by DuckDB the way core
    // scanners are, so load it explicitly before CREATE SECRET (TYPE snowflake).
    // Preinstalled in the image (offline LOAD); fall back to a community install.
    try {
      await opts.exec("LOAD snowflake");
    } catch (_e) {
      await opts.exec("INSTALL snowflake FROM community");
      await opts.exec("LOAD snowflake");
    }
    const account = sqlQuote(c.host);
    const user = sqlQuote(c.adminUsername);
    const privateKey = sqlQuote(c.privateKey);
    const secretName = `${alias}_secret`;
    const parts = [
      `TYPE snowflake`,
      `ACCOUNT '${account}'`,
      `USER '${user}'`,
      `AUTH_TYPE 'key_pair'`,
      `PRIVATE_KEY '${privateKey}'`,
    ];
    if (c.privateKeyPassphrase) parts.push(`PRIVATE_KEY_PASSPHRASE '${sqlQuote(c.privateKeyPassphrase)}'`);
    if (c.warehouse) parts.push(`WAREHOUSE '${sqlQuote(c.warehouse)}'`);
    if (c.name) parts.push(`DATABASE '${sqlQuote(c.name)}'`);
    if (c.schema) parts.push(`SCHEMA '${sqlQuote(c.schema)}'`);
    if (c.role) parts.push(`ROLE '${sqlQuote(c.role)}'`);
    await opts.exec(`CREATE OR REPLACE SECRET ${secretName} (${parts.join(", ")})`);
    await opts.exec(
      `ATTACH IF NOT EXISTS '' AS ${alias} (TYPE snowflake, SECRET ${secretName}, READ_ONLY)`,
    );
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
