#!/usr/bin/env node
// Sidecar entrypoint helper: read SUPABASE_ANON_KEY and SUPABASE_SERVICE_KEY
// from trex's `trexdb.setting` table at boot. Trex generates those keys on
// first startup; we read them straight from Postgres since the studio
// sidecar shares the same database.
//
// Emits two lines on stdout:
//   SUPABASE_ANON_KEY=<value>
//   SUPABASE_SERVICE_KEY=<value>
// The wrapping entrypoint can source these into env before launching the
// Next.js server.

const path = require("node:path");
const { Client } = require(path.join(
  "/app/node_modules/.pnpm",
  require("node:fs")
    .readdirSync("/app/node_modules/.pnpm")
    .find((d) => d.startsWith("pg@")),
  "node_modules/pg",
));

async function main() {
  const host = process.env.POSTGRES_HOST || "postgres";
  const port = parseInt(process.env.POSTGRES_PORT || "5432", 10);
  const password = process.env.POSTGRES_PASSWORD || "";
  const database = process.env.POSTGRES_DB || "testdb";

  const client = new Client({
    host,
    port,
    user: "postgres",
    password,
    database,
  });
  await client.connect();
  try {
    const r = await client.query(
      "SELECT key, value FROM trexdb.setting WHERE key IN ('auth.anonKey', 'auth.serviceRoleKey')",
    );
    const map = {};
    for (const row of r.rows) {
      let v = row.value;
      if (typeof v === "string") {
        try { v = JSON.parse(v); } catch { /* keep as-is */ }
      }
      map[row.key] = v;
    }
    if (map["auth.anonKey"]) process.stdout.write(`SUPABASE_ANON_KEY=${map["auth.anonKey"]}\n`);
    if (map["auth.serviceRoleKey"]) process.stdout.write(`SUPABASE_SERVICE_KEY=${map["auth.serviceRoleKey"]}\n`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  process.stderr.write(`[fetch-trex-keys] failed: ${e.message}\n`);
  process.exit(0); // soft-fail: don't block sidecar startup
});
