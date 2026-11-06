// See ai-provider-config.test-utils.ts for how to run (PG__SSL, SERVICE_ROUTES, key stub).
import {
  assert,
  assertEquals,
  assertFalse,
  assertNotEquals,
  assertRejects,
  assertStrictEquals,
} from "@std/assert";
import { REDACTED_TEXT } from "../common/const.ts";
import { AI_PROVIDER_CONFIG_LOCK_KEY } from "./ai-provider-config.service.ts";
import {
  anthropic,
  bedrock,
  KEY_A,
  KEY_B,
  openai,
  setup,
  TestService,
} from "./ai-provider-config.test-utils.ts";
import { decryptApiKey, parseEncryptionKey } from "./crypto.ts";
import { AiProviderConfigError } from "./errors.ts";

const LOCK_SQL = `SELECT pg_advisory_xact_lock(${AI_PROVIDER_CONFIG_LOCK_KEY})`;

async function expectError(
  p: Promise<unknown>,
  status: number,
  code: string,
  field?: string,
) {
  const e = await assertRejects(() => p, AiProviderConfigError);
  assertEquals(e.status, status);
  assertEquals(e.code, code);
  assertEquals(e.field, field);
  return e;
}

/** A 409 from the service's own pre-check: no write query reached the fake DB. */
async function expectPreCheckDuplicate(
  db: ReturnType<typeof setup>["db"],
  p: () => Promise<unknown>,
  write: "manager.insert" | "manager.update",
) {
  db.reset();
  await expectError(p(), 409, "AI_PROVIDER_CONFIG_DUPLICATE");
  assertFalse(db.queries.includes(write), `${write} ran: 409 came from the index backstop`);
}

// ---------------------------------------------------------------- withLock

Deno.test("withLock: errors thrown by fn survive unchanged, with rollback and release", async () => {
  const cases: [number, string][] = [
    [409, "AI_PROVIDER_CONFIG_DUPLICATE"],
    [404, "AI_PROVIDER_CONFIG_NOT_FOUND"],
    [400, "AI_PROVIDER_CONFIG_INVALID"],
  ];
  for (const [status, code] of cases) {
    const { db, svc } = setup();
    const thrown = new AiProviderConfigError(
      status,
      // deno-lint-ignore no-explicit-any
      code as any,
      "boom",
      status === 400 ? "model" : undefined,
    );
    const caught = await assertRejects(() =>
      svc.withLock(() => Promise.reject(thrown))
    );
    assertStrictEquals(caught, thrown); // same instance: not wrapped
    assertEquals((caught as AiProviderConfigError).status, status);
    assertEquals((caught as AiProviderConfigError).code, code);
    assertEquals(db.rollbacks, 1);
    assertEquals(db.releases, 1);
    assertEquals(db.commits, 0);
  }
});

Deno.test("withLock: other errors are rethrown unchanged; commit and release on success", async () => {
  const { db, svc } = setup();
  const other = new Error("something else");
  assertStrictEquals(
    await assertRejects(() => svc.withLock(() => Promise.reject(other))),
    other,
  );
  assertEquals([db.rollbacks, db.releases], [1, 1]);

  db.reset();
  assertEquals(await svc.withLock(() => Promise.resolve(42)), 42);
  assertEquals([db.commits, db.rollbacks, db.releases], [1, 0, 1]);
});

Deno.test("withLock: 23505 on the unique index -> 409; on the selected index -> unchanged", async () => {
  const { svc } = setup();
  const mk = (constraint: string) =>
    Object.assign(new Error("dup"), { code: "23505", constraint });
  await expectError(
    svc.withLock(() => Promise.reject(mk("ai_provider_config_unique_idx"))),
    409,
    "AI_PROVIDER_CONFIG_DUPLICATE",
  );
  const sel = mk("ai_provider_config_selected_idx");
  assertStrictEquals(
    await assertRejects(() => svc.withLock(() => Promise.reject(sel))),
    sel,
  );
  // TypeORM keeps the pg error under driverError
  const wrapped = Object.assign(new Error("q"), {
    driverError: { code: "23505", constraint: "ai_provider_config_unique_idx" },
  });
  await expectError(
    svc.withLock(() => Promise.reject(wrapped)),
    409,
    "AI_PROVIDER_CONFIG_DUPLICATE",
  );
});

// ------------------------------------------------------- No pool access, lock

Deno.test("create, update, select, delete use only the query runner (pool access throws)", async () => {
  const { db, svc } = setup();
  const a = await svc.create(bedrock());
  const b = await svc.create(bedrock({ region: "eu-west-1" }));
  await svc.update(String(b.id), bedrock({ region: "eu-west-1", model: "m2" }));
  await svc.select(String(b.id));
  await svc.delete(String(a.id));
  assertEquals(db.poolCalls, []);
  assertEquals(db.runnersCreated, 5);
  assertEquals(db.releases, 5);
});

Deno.test("the first statement of create, update, select and delete is the advisory lock", async () => {
  const { db, svc } = setup();
  const ops: [string, () => Promise<unknown>][] = [
    ["create", () => svc.create(bedrock())],
    ["update", () => svc.update("1", bedrock({ model: "m2" }))],
    ["select", () => svc.select("1")],
    ["delete", () => svc.delete("1")],
  ];
  for (const [name, op] of ops) {
    db.reset();
    await op();
    assertEquals(db.queries[0], LOCK_SQL, name);
    assertEquals(
      db.queries.filter((q) => q.includes("pg_advisory_xact_lock")).length,
      1,
      name,
    );
  }
  assertEquals(LOCK_SQL, "SELECT pg_advisory_xact_lock(3561003561)");
});

// ------------------------------------------------------------------ Validation

Deno.test("per-host validation", async () => {
  const { svc } = setup();
  await expectError(svc.create(bedrock({ region: undefined })), 400, "AI_PROVIDER_CONFIG_INVALID", "region");
  await expectError(svc.create(openai({ baseUrl: undefined })), 400, "AI_PROVIDER_CONFIG_INVALID", "baseUrl");
  await expectError(svc.create({ ...bedrock(), host: "gemini" }), 400, "AI_PROVIDER_CONFIG_INVALID", "host");
  await expectError(svc.create(null), 400, "AI_PROVIDER_CONFIG_INVALID", "host");
  await expectError(svc.create(bedrock({ model: "  " })), 400, "AI_PROVIDER_CONFIG_INVALID", "model");
  // Anthropic with and without a workspace id both succeed
  const w = await svc.create(anthropic({ workspaceId: "ws1" }));
  const n = await svc.create(anthropic());
  assertEquals([w.workspaceId, n.workspaceId], ["ws1", null]);
});

Deno.test("optional fields: blank -> NULL, non-blank on a host that does not use them -> 400", async () => {
  const { db, svc } = setup();
  await expectError(svc.create(anthropic({ region: "us-east-1" })), 400, "AI_PROVIDER_CONFIG_INVALID", "region");
  await expectError(svc.create(bedrock({ baseUrl: "https://x" })), 400, "AI_PROVIDER_CONFIG_INVALID", "baseUrl");
  await expectError(svc.create(bedrock({ workspaceId: "w" })), 400, "AI_PROVIDER_CONFIG_INVALID", "workspaceId");
  await expectError(svc.create(openai({ baseUrl: "   " })), 400, "AI_PROVIDER_CONFIG_INVALID", "baseUrl");
  await expectError(svc.create(openai({ region: "r" })), 400, "AI_PROVIDER_CONFIG_INVALID", "region");
  const r = await svc.create(anthropic({ region: "", workspaceId: "   " }));
  assertEquals([r.region, r.workspaceId, r.baseUrl], [null, null, null]);
  assertEquals(db.rows[0].region, null);
  assertEquals(db.rows[0].workspaceId, null);
  // nothing was written by the failed requests
  assertEquals(db.rows.length, 1);
});

Deno.test("base URL: http(s) only, trimmed, otherwise as typed; /v1 and /v1/ coexist", async () => {
  const { db, svc } = setup();
  for (const bad of ["not a url", "ftp://x/v1", "x/v1", "javascript:alert(1)"]) {
    await expectError(svc.create(openai({ baseUrl: bad })), 400, "AI_PROVIDER_CONFIG_INVALID", "baseUrl");
  }
  const t = await svc.create(openai({ baseUrl: " https://x/v1 " }));
  assertEquals(t.baseUrl, "https://x/v1");
  const s = await svc.create(openai({ baseUrl: "https://x/v1/" }));
  assertEquals(s.baseUrl, "https://x/v1/");
  await expectPreCheckDuplicate(db, () => svc.create(openai({ baseUrl: "https://x/v1" })), "manager.insert");
  assertEquals((await svc.create(openai({ baseUrl: "http://localhost:8080", model: "q" }))).baseUrl, "http://localhost:8080");
});

Deno.test("API key: empty -> _INVALID, placeholder on create -> _INVALID", async () => {
  const { svc } = setup();
  for (const apiKey of ["", "   ", undefined, 5]) {
    await expectError(svc.create(bedrock({ apiKey })), 400, "AI_PROVIDER_CONFIG_INVALID", "apiKey");
  }
  await expectError(svc.create(bedrock({ apiKey: REDACTED_TEXT })), 400, "AI_PROVIDER_CONFIG_INVALID", "apiKey");
  const c = await svc.create(bedrock());
  await expectError(svc.update(String(c.id), bedrock({ apiKey: "" })), 400, "AI_PROVIDER_CONFIG_INVALID", "apiKey");
});

Deno.test("API key is trimmed before storing", async () => {
  const { db, svc } = setup(KEY_A);
  await svc.create(bedrock({ apiKey: "  sk-padded\n" }));
  assertEquals(decryptApiKey(db.rows[0].apiKeyEncrypted, parseEncryptionKey(KEY_A)!), "sk-padded");
  await svc.update("1", bedrock({ apiKey: "\tsk-new " }));
  assertEquals(decryptApiKey(db.rows[0].apiKeyEncrypted, parseEncryptionKey(KEY_A)!), "sk-new");
});

Deno.test("padded placeholder: rejected on create, keeps the stored key on update", async () => {
  const { db, svc } = setup();
  const padded = ` ${REDACTED_TEXT} \n`;
  await expectError(svc.create(bedrock({ apiKey: padded })), 400, "AI_PROVIDER_CONFIG_INVALID", "apiKey");
  assertEquals(db.rows.length, 0);
  const b = await svc.create(bedrock());
  const stored = db.rows[0].apiKeyEncrypted;
  await svc.update(String(b.id), bedrock({ model: "m2", apiKey: padded }));
  assertEquals(db.rows[0].apiKeyEncrypted, stored);
  assertEquals(db.rows[0].model, "m2");
  // still subject to the placeholder rule: host change -> _KEY_REQUIRED
  await expectError(
    svc.update(String(b.id), anthropic({ apiKey: padded })),
    400,
    "AI_PROVIDER_CONFIG_KEY_REQUIRED",
  );
});

Deno.test("placeholder rule on update", async () => {
  const { db, svc } = setup();
  const b = await svc.create(bedrock());
  const stored = db.rows[0].apiKeyEncrypted;
  // model-only and region-only edits keep the key
  await svc.update(String(b.id), bedrock({ model: "m2", apiKey: REDACTED_TEXT }));
  await svc.update(String(b.id), bedrock({ model: "m2", region: "eu-west-1", apiKey: REDACTED_TEXT }));
  assertEquals(db.rows[0].apiKeyEncrypted, stored);
  assertEquals(db.rows[0].region, "eu-west-1");
  // host change -> _KEY_REQUIRED
  await expectError(
    svc.update(String(b.id), anthropic({ apiKey: REDACTED_TEXT })),
    400,
    "AI_PROVIDER_CONFIG_KEY_REQUIRED",
  );
  assertEquals(db.rows[0].host, "bedrock");

  // workspace-only edit keeps the key; base URL change does not
  const a = await svc.create(anthropic({ workspaceId: "w1" }));
  const aStored = db.rows[1].apiKeyEncrypted;
  await svc.update(String(a.id), anthropic({ workspaceId: "w2", apiKey: REDACTED_TEXT }));
  assertEquals(db.rows[1].apiKeyEncrypted, aStored);
  const o = await svc.create(openai());
  await expectError(
    svc.update(String(o.id), openai({ baseUrl: "https://y/v1", apiKey: REDACTED_TEXT })),
    400,
    "AI_PROVIDER_CONFIG_KEY_REQUIRED",
  );
  // trimmed base URL equals stored -> kept
  await svc.update(String(o.id), openai({ baseUrl: " https://x/v1 ", apiKey: REDACTED_TEXT, model: "gpt2" }));

  // a new key replaces the ciphertext
  await svc.update(String(b.id), bedrock({ model: "m2", region: "eu-west-1", apiKey: "new-key" }));
  assertNotEquals(db.rows[0].apiKeyEncrypted, stored);
});

Deno.test("placeholder rejected when the stored key is unreadable", async () => {
  const { db, svc } = setup(KEY_A);
  const b = await svc.create(bedrock());
  const other = new TestService(db, KEY_B);
  await expectError(
    other.update(String(b.id), bedrock({ apiKey: REDACTED_TEXT, model: "m2" })),
    400,
    "AI_PROVIDER_CONFIG_KEY_REQUIRED",
  );
  // a real new key works
  await other.update(String(b.id), bedrock({ apiKey: "fresh", model: "m2" }));
  assertEquals(decryptApiKey(db.rows[0].apiKeyEncrypted, parseEncryptionKey(KEY_B)!), "fresh");
});

Deno.test("PUT with isSelected -> 400 field isSelected; echoing the GET response minus isSelected works", async () => {
  const { db, svc } = setup();
  const c = await svc.create(bedrock());
  await expectError(
    svc.update(String(c.id), { ...bedrock({ apiKey: REDACTED_TEXT }), isSelected: false }),
    400,
    "AI_PROVIDER_CONFIG_INVALID",
    "isSelected",
  );
  await expectError(
    svc.update(String(c.id), { ...bedrock({ apiKey: REDACTED_TEXT }), isSelected: true }),
    400,
    "AI_PROVIDER_CONFIG_INVALID",
    "isSelected",
  );
  db.allowPool = true;
  // Other properties are ignored: echo the GET response (id, keyReadable, apiKey placeholder, nulls) minus isSelected
  const echoed = { ...(await svc.get(String(c.id))) } as Record<string, unknown>;
  delete echoed.isSelected;
  echoed.keyReadable = false; // sent back by a client, but ignored; the stored key is still readable
  echoed.model = "edited";
  echoed.unknownProp = "ignored";
  const out = await svc.update(String(c.id), echoed);
  assertEquals(out.model, "edited");
  assertEquals(out.id, c.id);
  assertEquals(db.rows[0].id, c.id);
  assertEquals(db.rows.length, 1);
  assertFalse("keyReadable" in out);
});

// ----------------------------------------------------------------- Uniqueness

Deno.test("uniqueness: NULLs compare equal; \"\", null and omitted are the same", async () => {
  const { db, svc } = setup();
  await svc.create(anthropic());
  for (const v of [{}, { workspaceId: "" }, { workspaceId: null }, { workspaceId: "  " }, { region: "" }]) {
    await expectPreCheckDuplicate(db, () => svc.create(anthropic(v)), "manager.insert");
  }
  // coexist: different region, different/missing workspace, different model
  await svc.create(bedrock());
  await svc.create(bedrock({ region: "eu-west-1" }));
  await svc.create(anthropic({ workspaceId: "w1" }));
  await svc.create(anthropic({ workspaceId: "w2" }));
  await svc.create(anthropic({ model: "other" }));
  await expectPreCheckDuplicate(db, () => svc.create(bedrock()), "manager.insert");
  // case-sensitive model
  await svc.create(bedrock({ model: "M1" }));
});

Deno.test("uniqueness on update: duplicate -> 409, own identity is fine", async () => {
  const { db, svc } = setup();
  const a = await svc.create(bedrock());
  const b = await svc.create(bedrock({ region: "eu-west-1" }));
  await expectPreCheckDuplicate(db, () => svc.update(String(b.id), bedrock({ apiKey: "k" })), "manager.update");
  await svc.update(String(a.id), bedrock({ apiKey: "k2" })); // same identity as itself
  assertEquals(db.rows[1].region, "eu-west-1");
});

Deno.test("a race that reaches the unique index is mapped to 409 and rolled back", async () => {
  const { db, svc } = setup();
  db.failNextInsertWith = Object.assign(new Error("dup"), {
    code: "23505",
    constraint: "ai_provider_config_unique_idx",
  });
  await expectError(svc.create(bedrock()), 409, "AI_PROVIDER_CONFIG_DUPLICATE");
  assertEquals([db.rollbacks, db.releases], [1, 1]);
});

// ------------------------------------------------------------------ Selection

Deno.test("selection: first create is selected, later ones are not; select moves it", async () => {
  const { db, svc } = setup();
  const a = await svc.create(bedrock());
  const b = await svc.create(bedrock({ region: "eu-west-1" }));
  assertEquals([a.isSelected, b.isSelected], [true, false]);
  const sel = await svc.select(String(b.id));
  assertEquals(sel.isSelected, true);
  assertEquals(db.rows.map((r) => r.isSelected), [false, true]);
  // selecting the already-selected row is a 200 no-op (no writes)
  db.reset();
  const again = await svc.select(String(b.id));
  assertEquals(again.isSelected, true);
  assertFalse(db.queries.includes("manager.update"));
});

Deno.test("selection: create when none is selected is auto-selected (repairs a lost selection)", async () => {
  const { db, svc } = setup();
  await svc.create(bedrock());
  db.rows[0].isSelected = false;
  const c = await svc.create(bedrock({ region: "eu-west-1" }));
  assertEquals(c.isSelected, true);
  assertEquals(db.rows.filter((r) => r.isSelected).length, 1);
});

Deno.test("select with an unknown id -> 404 and the previous selection is unchanged", async () => {
  const { db, svc } = setup();
  await svc.create(bedrock());
  await svc.create(bedrock({ region: "eu-west-1" }));
  db.reset();
  await expectError(svc.select("999"), 404, "AI_PROVIDER_CONFIG_NOT_FOUND");
  assertEquals(db.rows.map((r) => r.isSelected), [true, false]);
  assertFalse(db.queries.includes("manager.update"));
});

Deno.test("select sets modified_by on both changed rows", async () => {
  const db = setup().db;
  const creator = new TestService(db, KEY_A, "admin-a");
  await creator.create(bedrock());
  const b = await creator.create(bedrock({ region: "eu-west-1" }));
  assertEquals(db.rows.map((r) => r.modifiedBy), ["admin-a", "admin-a"]);
  await new TestService(db, KEY_A, "admin-b").select(String(b.id));
  assertEquals(db.rows.map((r) => r.isSelected), [false, true]);
  assertEquals(db.rows.map((r) => r.modifiedBy), ["admin-b", "admin-b"]);
  assertEquals(db.rows.map((r) => r.createdBy), ["admin-a", "admin-a"]);
});

Deno.test("select writes clear-then-set as two statements", async () => {
  const { db, svc } = setup();
  await svc.create(bedrock());
  const b = await svc.create(bedrock({ region: "eu-west-1" }));
  db.reset();
  await svc.select(String(b.id));
  assertEquals(db.queries.filter((q) => q === "manager.update").length, 2);
});

Deno.test(":id edge cases -> 404 _NOT_FOUND with no DB call", async () => {
  const { db, svc } = setup();
  db.allowPool = true;
  for (const id of ["abc", "0", "-1", "99999999999", "2147483648", "1.5", "", " 1", "1e3", "01"]) {
    for (
      const op of [
        () => svc.get(id),
        () => svc.update(id, bedrock()),
        () => svc.select(id),
        () => svc.delete(id),
      ]
    ) {
      await expectError(op(), 404, "AI_PROVIDER_CONFIG_NOT_FOUND");
    }
  }
  assertEquals(db.runnersCreated, 0);
  assertEquals(db.poolCalls, []);
  assertEquals(db.queries, []);
  // int4 max is a valid id (just unknown)
  await expectError(svc.get("2147483647"), 404, "AI_PROVIDER_CONFIG_NOT_FOUND");
});

// --------------------------------------------------------------------- Delete

Deno.test("delete rules", async () => {
  const { db, svc } = setup();
  const a = await svc.create(bedrock());
  const b = await svc.create(bedrock({ region: "eu-west-1" }));
  await expectError(svc.delete(String(a.id)), 400, "AI_PROVIDER_CONFIG_SELECTED_DELETE");
  assertEquals(db.rows.length, 2);
  await expectError(svc.delete("999"), 404, "AI_PROVIDER_CONFIG_NOT_FOUND");
  assertEquals(await svc.delete(String(b.id)), { id: b.id }); // non-selected
  assertEquals(await svc.delete(String(a.id)), { id: a.id }); // last, selected
  assertEquals(db.rows.length, 0);
  // none selected afterwards; the next create is auto-selected
  assertEquals((await svc.create(bedrock())).isSelected, true);
});

// ------------------------------------------------------------ Response / reads

Deno.test("response shape is redacted and omits audit columns, ciphertext and keyReadable when readable", async () => {
  const { db, svc } = setup();
  const c = await svc.create(openai());
  assertEquals(c, {
    id: 1,
    host: "openai-compatible",
    model: "gpt",
    baseUrl: "https://x/v1",
    region: null,
    workspaceId: null,
    apiKey: REDACTED_TEXT,
    isSelected: true,
  });
  assertFalse("keyReadable" in c);
  assertEquals(db.rows[0].createdBy, "tester");
  assertEquals(db.rows[0].modifiedBy, "tester");
});

Deno.test("list is ordered by id and get works (pool-bound reads only)", async () => {
  const { db, svc } = setup();
  await svc.create(bedrock());
  await svc.create(anthropic());
  await svc.create(openai());
  db.allowPool = true;
  db.reset();
  const list = await svc.list();
  assertEquals(list.map((r) => r.id), [1, 2, 3]);
  assertEquals((await svc.get("2")).host, "anthropic");
  await expectError(svc.get("77"), 404, "AI_PROVIDER_CONFIG_NOT_FOUND");
  assertEquals(db.runnersCreated, 0);
});

// ------------------------------------------------------------- Encryption key

Deno.test("encryption key unset, empty, not 32 bytes: reads 200 keyReadable false, create/update 500, select/delete work", async () => {
  const bad: (string | undefined)[] = [
    undefined,
    "",
    Buffer16(),
    "not base64 !!",
  ];
  for (const raw of bad) {
    const { db, svc } = setup(KEY_A);
    const a = await svc.create(bedrock());
    const b = await svc.create(bedrock({ region: "eu-west-1" }));
    const degraded = new TestService(db, raw);
    db.allowPool = true;

    const list = await degraded.list();
    assertEquals(list.map((r) => r.keyReadable), [false, false]);
    assertEquals((await degraded.get(String(a.id))).keyReadable, false);

    await expectError(degraded.create(bedrock({ region: "ap-1" })), 500, "AI_PROVIDER_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED");
    await expectError(degraded.update(String(a.id), bedrock({ model: "x" })), 500, "AI_PROVIDER_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED");
    // the key check comes first, before :id parsing, validation and the placeholder rule
    await expectError(degraded.update("abc", bedrock({ apiKey: REDACTED_TEXT })), 500, "AI_PROVIDER_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED");
    await expectError(degraded.update(String(a.id), { host: "nope" }), 500, "AI_PROVIDER_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED");
    await expectError(
      degraded.update(String(a.id), bedrock({ apiKey: REDACTED_TEXT })),
      500,
      "AI_PROVIDER_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED",
    );
    await expectError(degraded.create(bedrock({ apiKey: REDACTED_TEXT })), 500, "AI_PROVIDER_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED");

    // select and delete do not need the key
    assertEquals((await degraded.select(String(b.id))).isSelected, true);
    assertEquals(await degraded.delete(String(a.id)), { id: a.id });
    assertEquals(db.rows.length, 1);
  }
});

function Buffer16() {
  return btoa("0123456789abcdef"); // 16 bytes
}

Deno.test("valid key round trip; api_key_encrypted is not plaintext; wrong key -> keyReadable false", async () => {
  const { db, svc } = setup(KEY_A);
  const c = await svc.create(bedrock({ apiKey: "sk-super-secret" }));
  const stored = db.rows[0].apiKeyEncrypted as string;
  assertFalse(stored.includes("sk-super-secret"));
  assertNotEquals(stored, "sk-super-secret");
  assertEquals(decryptApiKey(stored, parseEncryptionKey(KEY_A)!), "sk-super-secret");

  db.allowPool = true;
  assertFalse("keyReadable" in (await svc.get(String(c.id))));
  const wrong = new TestService(db, KEY_B);
  assertEquals((await wrong.get(String(c.id))).keyReadable, false);
  assertEquals((await wrong.list())[0].keyReadable, false);

  // same plaintext twice gives different ciphertext (random IV)
  await svc.create(bedrock({ region: "eu", apiKey: "sk-super-secret" }));
  assertNotEquals(db.rows[1].apiKeyEncrypted, stored);
});

Deno.test("no response, error or log line contains an API key or the env key", async () => {
  const logged: string[] = [];
  const orig = { log: console.log, error: console.error, warn: console.warn, info: console.info };
  for (const m of ["log", "error", "warn", "info"] as const) {
    console[m] = (...a: unknown[]) => void logged.push(a.map(String).join(" "));
  }
  const outputs: string[] = [];
  try {
    const { db, svc } = setup(KEY_A);
    const c = await svc.create(bedrock({ apiKey: "sk-leak-check" }));
    outputs.push(JSON.stringify(c));
    db.allowPool = true;
    outputs.push(JSON.stringify(await svc.list()), JSON.stringify(await svc.get("1")));
    outputs.push(JSON.stringify(await svc.update("1", bedrock({ apiKey: "sk-leak-2", model: "z" }))));
    for (
      const p of [
        svc.create(bedrock({ model: "z", apiKey: "sk-leak-3" })), // duplicate
        svc.create(bedrock({ region: undefined, apiKey: "sk-leak-4" })),
        new TestService(db, undefined).create(bedrock({ apiKey: "sk-leak-5" })),
      ]
    ) {
      try {
        await p;
      } catch (e) {
        outputs.push(JSON.stringify(e), String((e as Error).message), String((e as Error).stack));
      }
    }
  } finally {
    Object.assign(console, orig);
  }
  const all = [...outputs, ...logged].join("\n");
  for (const secret of ["sk-leak-check", "sk-leak-2", "sk-leak-3", "sk-leak-4", "sk-leak-5", KEY_A, KEY_B]) {
    assertFalse(all.includes(secret), `leaked ${secret.slice(0, 8)}`);
  }
  assert(logged.length === 0);
});

Deno.test("the DataSource comes from PostgresService.getDataSourceAsync, never initialize()", async () => {
  const { db, svc } = setup();
  db.dataSource.initialize = () => {
    throw new Error("initialize() called directly");
  };
  await svc.create(bedrock());
  await svc.create(bedrock({ region: "x" }));
  db.allowPool = true;
  await svc.list();
  await svc.get("1");
  assertEquals(db.asyncDataSourceCalls, 4);
});
