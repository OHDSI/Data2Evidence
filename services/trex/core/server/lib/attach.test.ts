//deno test --no-check --allow-env --allow-read services/trex/core/server/lib/attach.test.ts
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ensureAttached, ensureCacheAttached, ensureSourceAttached, type ExecFn, isValidIdentifier, type SourceCredential } from "./attach.ts";

Deno.test("isValidIdentifier — accepts plain identifiers", () => {
  assertEquals(isValidIdentifier("alp_db_svc"), true);
  assertEquals(isValidIdentifier("DS_2024"), true);
  assertEquals(isValidIdentifier("_underscore"), true);
});

Deno.test("isValidIdentifier — rejects empty string", () => {
  assertEquals(isValidIdentifier(""), false);
});

Deno.test("isValidIdentifier — rejects identifiers starting with a digit", () => {
  assertEquals(isValidIdentifier("9bad"), false);
});

Deno.test("isValidIdentifier — rejects path-traversal and SQL-injection chars", () => {
  assertEquals(isValidIdentifier("../etc/passwd"), false);
  assertEquals(isValidIdentifier("a'; DROP TABLE x; --"), false);
  assertEquals(isValidIdentifier("a-b"), false);
  assertEquals(isValidIdentifier("a.b"), false);
  assertEquals(isValidIdentifier("a b"), false);
});

Deno.test("isValidIdentifier — boundary at 128 chars", () => {
  assertEquals(isValidIdentifier("a".repeat(128)), true);
  assertEquals(isValidIdentifier("a".repeat(129)), false);
});

function makeTempCacheDir(): string {
  const dir = Deno.makeTempDirSync({ prefix: "trex_attach_test_" });
  return dir;
}

Deno.test("ensureCacheAttached — issues ATTACH for an existing cache file", async () => {
  const dir = makeTempCacheDir();
  try {
    Deno.writeFileSync(`${dir}/exists.db`, new Uint8Array());
    const calls: string[] = [];
    const exec: ExecFn = (sql) => { calls.push(sql); };
    await ensureCacheAttached("exists", { cacheDir: dir, exec });
    assertEquals(calls.length, 1);
    assertEquals(
      calls[0],
      `ATTACH IF NOT EXISTS '${dir}/exists.db' AS exists`,
    );
  } finally {
    Deno.removeSync(dir, { recursive: true });
  }
});

Deno.test("ensureCacheAttached — skips silently when file is missing", async () => {
  const dir = makeTempCacheDir();
  try {
    const calls: string[] = [];
    const exec: ExecFn = (sql) => { calls.push(sql); };
    await ensureCacheAttached("ghost", { cacheDir: dir, exec });
    assertEquals(calls.length, 0);
  } finally {
    Deno.removeSync(dir, { recursive: true });
  }
});

Deno.test("ensureCacheAttached — calls exec when file is missing but createDbFileIfMissing is true", async () => {
  const dir = makeTempCacheDir();
  try {
    const calls: string[] = [];
    const exec: ExecFn = (sql) => { calls.push(sql); };
    await ensureCacheAttached("new_db", { cacheDir: dir, exec, createDbFileIfMissing: true });
    assertEquals(calls.length, 1);
    assertEquals(
      calls[0],
      `ATTACH IF NOT EXISTS '${dir}/new_db.db' AS new_db`,
    );
  } finally {
    Deno.removeSync(dir, { recursive: true });
  }
});

Deno.test("ensureCacheAttached — defaults createDbFileIfMissing to false", async () => {
  const dir = makeTempCacheDir();
  try {
    const calls: string[] = [];
    const exec: ExecFn = (sql) => { calls.push(sql); };
    await ensureCacheAttached("missing", { cacheDir: dir, exec });
    assertEquals(calls.length, 0);
  } finally {
    Deno.removeSync(dir, { recursive: true });
  }
});

Deno.test("ensureCacheAttached — calls exec when file exists regardless of createDbFileIfMissing", async () => {
  const dir = makeTempCacheDir();
  try {
    Deno.writeFileSync(`${dir}/existing.db`, new Uint8Array());
    const calls: string[] = [];
    const exec: ExecFn = (sql) => { calls.push(sql); };
    await ensureCacheAttached("existing", { cacheDir: dir, exec, createDbFileIfMissing: false });
    assertEquals(calls.length, 1);
    assertEquals(
      calls[0],
      `ATTACH IF NOT EXISTS '${dir}/existing.db' AS existing`,
    );
  } finally {
    Deno.removeSync(dir, { recursive: true });
  }
});

Deno.test("ensureCacheAttached — throws on invalid identifier without calling exec", async () => {
  const calls: string[] = [];
  const exec: ExecFn = (sql) => { calls.push(sql); };
  let threw = false;
  try {
    await ensureCacheAttached("../bad", { cacheDir: "/tmp", exec });
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message.includes("invalid identifier"), true);
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});

Deno.test("ensureSourceAttached — postgres builds the expected ATTACH SQL", async () => {
  const calls: string[] = [];
  const exec: ExecFn = (sql) => { calls.push(sql); };
  const c: SourceCredential = {
    id: "alp_db_svc",
    dialect: "postgres",
    host: "h",
    port: 5432,
    name: "d",
    adminUsername: "u",
    adminPassword: "p",
  };
  await ensureSourceAttached(c, { exec });
  assertEquals(calls.length, 1);
  assertEquals(
    calls[0],
    "ATTACH IF NOT EXISTS 'host=h port=5432 dbname=d user=u password=p' AS alp_db_svc__srcdb (TYPE postgres)",
  );
});

Deno.test("ensureSourceAttached — bigquery builds the expected ATTACH SQL", async () => {
  const calls: string[] = [];
  const exec: ExecFn = (sql) => { calls.push(sql); };
  const c: SourceCredential = {
    id: "bq_alpha",
    dialect: "bigquery",
    host: "my-project",
    name: "my_dataset",
    adminUsername: "ignored",
    adminPassword: "ignored",
  };
  await ensureSourceAttached(c, { exec });
  assertEquals(calls.length, 1);
  assertEquals(
    calls[0],
    "ATTACH IF NOT EXISTS 'project=my-project dataset=my_dataset' AS bq_alpha__srcdb (TYPE bigquery, READ_ONLY)",
  );
});

Deno.test("ensureSourceAttached — bigquery with empty name attaches the whole project", async () => {
  const calls: string[] = [];
  const exec: ExecFn = (sql) => { calls.push(sql); };
  const c: SourceCredential = {
    id: "bq_alpha",
    dialect: "bigquery",
    host: "my-project",
    name: "",
    adminUsername: "ignored",
    adminPassword: "ignored",
  };
  await ensureSourceAttached(c, { exec });
  assertEquals(calls.length, 1);
  assertEquals(
    calls[0],
    "ATTACH IF NOT EXISTS 'project=my-project' AS bq_alpha__srcdb (TYPE bigquery, READ_ONLY)",
  );
});

Deno.test("ensureSourceAttached — unsupported dialect skips silently", async () => {
  const calls: string[] = [];
  const exec: ExecFn = (sql) => { calls.push(sql); };
  await ensureSourceAttached(
    { id: "x", dialect: "hana", host: "h", name: "d", adminUsername: "u", adminPassword: "p" },
    { exec },
  );
  assertEquals(calls.length, 0);
});

Deno.test("ensureSourceAttached — rejects invalid id without calling exec", async () => {
  const calls: string[] = [];
  const exec: ExecFn = (sql) => { calls.push(sql); };
  let threw = false;
  try {
    await ensureSourceAttached(
      { id: "..", dialect: "postgres", host: "h", port: 1, name: "d", adminUsername: "u", adminPassword: "p" },
      { exec },
    );
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message.includes("invalid identifier"), true);
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});

Deno.test("ensureAttached — calls source then cache attach for each id", async () => {
  const dir = Deno.makeTempDirSync({ prefix: "trex_attach_orchestrator_" });
  try {
    Deno.writeFileSync(`${dir}/dataset_a.db`, new Uint8Array());
    const calls: string[] = [];
    const exec: ExecFn = (sql) => { calls.push(sql); };

    await ensureAttached(
      {
        connections: [
          {
            id: "conn1",
            dialect: "postgres",
            host: "h",
            port: 5432,
            name: "d",
            adminUsername: "u",
            adminPassword: "p",
          },
        ],
        cacheIds: ["dataset_a", "missing_one"],
      },
      { cacheDir: dir, exec },
    );

    assertEquals(calls.length, 2);
    assertEquals(calls[0].includes("AS conn1__srcdb"), true);
    assertEquals(calls[1].includes(`AS dataset_a`), true);
    // missing_one was skipped — only 2 ATTACHes, not 3
  } finally {
    Deno.removeSync(dir, { recursive: true });
  }
});

Deno.test("ensureAttached — empty input is a no-op", async () => {
  const calls: string[] = [];
  const exec: ExecFn = (sql) => { calls.push(sql); };
  await ensureAttached({}, { exec });
  assertEquals(calls.length, 0);
});
