// See ai-config.test-utils.ts for how to run (PG__SSL, SERVICE_ROUTES, key stub).
import {
  assert,
  assertEquals,
  assertFalse,
  assertNotEquals,
  assertRejects,
  assertStrictEquals,
} from "@std/assert";
import { AI_CONFIG_LOCK_KEY } from "./ai-config.service.ts";
import {
  anthropic,
  bedrock,
  KEY_A,
  KEY_B,
  openai,
  setup,
  TestService,
} from "./ai-config.test-utils.ts";
import { decryptApiKey, parseEncryptionKey } from "./crypto.ts";
import { AiConfigError } from "./errors.ts";

const LOCK_SQL = `SELECT pg_advisory_xact_lock(${AI_CONFIG_LOCK_KEY})`;

async function expectError(
  p: Promise<unknown>,
  status: number,
  code: string,
  field?: string,
) {
  const e = await assertRejects(() => p, AiConfigError);
  assertEquals(e.status, status);
  assertEquals(e.code, code);
  assertEquals(e.field, field);
  return e;
}

/** A 409 from the service's own name pre-check: no write query reached the fake DB. */
async function expectPreCheckDuplicate(
  db: ReturnType<typeof setup>["db"],
  p: () => Promise<unknown>,
  write: "manager.insert" | "manager.update",
) {
  db.reset();
  await expectError(p(), 409, "AI_CONFIG_DUPLICATE", "name");
  assertFalse(db.queries.includes(write), `${write} ran: 409 came from the index backstop`);
}

// ---------------------------------------------------------------- withLock

Deno.test("withLock: errors thrown by fn survive unchanged, with rollback and release", async () => {
  const cases: [number, string][] = [
    [409, "AI_CONFIG_DUPLICATE"],
    [404, "AI_CONFIG_NOT_FOUND"],
    [400, "AI_CONFIG_INVALID"],
  ];
  for (const [status, code] of cases) {
    const { db, svc } = setup();
    const thrown = new AiConfigError(
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
    assertEquals((caught as AiConfigError).status, status);
    assertEquals((caught as AiConfigError).code, code);
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

Deno.test("withLock: 23505 on the name index -> 409 field name; on the active index -> unchanged", async () => {
  const { svc } = setup();
  const mk = (constraint: string) =>
    Object.assign(new Error("dup"), { code: "23505", constraint });
  await expectError(
    svc.withLock(() => Promise.reject(mk("ai_config_name_idx"))),
    409,
    "AI_CONFIG_DUPLICATE",
    "name",
  );
  const active = mk("ai_config_active_idx");
  assertStrictEquals(
    await assertRejects(() => svc.withLock(() => Promise.reject(active))),
    active,
  );
  // TypeORM keeps the pg error under driverError
  const wrapped = Object.assign(new Error("q"), {
    driverError: { code: "23505", constraint: "ai_config_name_idx" },
  });
  await expectError(
    svc.withLock(() => Promise.reject(wrapped)),
    409,
    "AI_CONFIG_DUPLICATE",
    "name",
  );
});

// ------------------------------------------------------- No pool access, lock

Deno.test("create, update, activate, delete use only the query runner (pool access throws)", async () => {
  const { db, svc } = setup();
  const a = await svc.create(bedrock());
  const b = await svc.create(bedrock({ region: "eu-west-1" }));
  await svc.update(String(b.id), bedrock({ region: "eu-west-1", model: "m2" }));
  await svc.activate(String(b.id));
  await svc.delete(String(a.id), String(b.id));
  assertEquals(db.poolCalls, []);
  assertEquals(db.runnersCreated, 5);
  assertEquals(db.releases, 5);
});

Deno.test("the first statement of create, update, activate and delete is the advisory lock", async () => {
  const { db, svc } = setup();
  const ops: [string, () => Promise<unknown>][] = [
    ["create", () => svc.create(bedrock())],
    ["update", () => svc.update("1", bedrock({ model: "m2" }))],
    ["activate", () => svc.activate("1")],
    ["delete", () => svc.delete("1", undefined)],
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

Deno.test("per-provider validation", async () => {
  const { svc } = setup();
  await expectError(svc.create(bedrock({ region: undefined })), 400, "AI_CONFIG_INVALID", "region");
  await expectError(svc.create(openai({ baseUrl: undefined })), 400, "AI_CONFIG_INVALID", "baseUrl");
  await expectError(svc.create({ ...bedrock(), provider: "gemini" }), 400, "AI_CONFIG_INVALID", "provider");
  await expectError(svc.create(null), 400, "AI_CONFIG_INVALID", "name");
  await expectError(svc.create(bedrock({ model: "  " })), 400, "AI_CONFIG_INVALID", "model");
  // Anthropic with and without a workspace id both succeed
  const w = await svc.create(anthropic({ workspaceId: "ws1" }));
  const n = await svc.create(anthropic());
  assertEquals([w.workspaceId, n.workspaceId], ["ws1", null]);
});

Deno.test("optional fields: blank -> NULL, non-blank on a provider that does not use them -> 400", async () => {
  const { db, svc } = setup();
  await expectError(svc.create(anthropic({ region: "us-east-1" })), 400, "AI_CONFIG_INVALID", "region");
  await expectError(svc.create(bedrock({ baseUrl: "https://x" })), 400, "AI_CONFIG_INVALID", "baseUrl");
  await expectError(svc.create(bedrock({ workspaceId: "w" })), 400, "AI_CONFIG_INVALID", "workspaceId");
  await expectError(svc.create(openai({ baseUrl: "   " })), 400, "AI_CONFIG_INVALID", "baseUrl");
  await expectError(svc.create(openai({ region: "r" })), 400, "AI_CONFIG_INVALID", "region");
  const r = await svc.create(anthropic({ region: "", workspaceId: "   " }));
  assertEquals([r.region, r.workspaceId, r.baseUrl], [null, null, null]);
  assertEquals(db.rows[0].region, null);
  assertEquals(db.rows[0].workspaceId, null);
  // nothing was written by the failed requests
  assertEquals(db.rows.length, 1);
});

Deno.test("base URL: http(s) only, trimmed, otherwise as typed", async () => {
  const { svc } = setup();
  for (const bad of ["not a url", "ftp://x/v1", "x/v1", "javascript:alert(1)"]) {
    await expectError(svc.create(openai({ baseUrl: bad })), 400, "AI_CONFIG_INVALID", "baseUrl");
  }
  const t = await svc.create(openai({ baseUrl: " https://x/v1 " }));
  assertEquals(t.baseUrl, "https://x/v1");
  const s = await svc.create(openai({ baseUrl: "https://x/v1/" }));
  assertEquals(s.baseUrl, "https://x/v1/");
  assertEquals((await svc.create(openai({ baseUrl: "http://localhost:8080", model: "q" }))).baseUrl, "http://localhost:8080");
});

Deno.test("name: blank or not a string -> 400 field name; stored trimmed", async () => {
  const { db, svc } = setup();
  for (const name of ["", "   ", "\t\n", undefined, null, 5]) {
    await expectError(svc.create(bedrock({ name })), 400, "AI_CONFIG_INVALID", "name");
  }
  assertEquals(db.rows.length, 0);
  const c = await svc.create(bedrock({ name: "  Prod " }));
  assertEquals(c.name, "Prod");
  assertEquals(db.rows[0].name, "Prod");
  await expectError(svc.update(String(c.id), bedrock({ name: " " })), 400, "AI_CONFIG_INVALID", "name");
  assertEquals(db.rows[0].name, "Prod");
});

Deno.test("API key: required on create, never blank when given on update", async () => {
  const { svc } = setup();
  for (const apiKey of ["", "   ", undefined, null, 5]) {
    await expectError(svc.create(bedrock({ apiKey })), 400, "AI_CONFIG_INVALID", "apiKey");
  }
  const c = await svc.create(bedrock());
  for (const apiKey of ["", "   ", null, 5]) {
    await expectError(svc.update(String(c.id), bedrock({ apiKey })), 400, "AI_CONFIG_INVALID", "apiKey");
  }
});

Deno.test("API key is trimmed before storing", async () => {
  const { db, svc } = setup(KEY_A);
  await svc.create(bedrock({ apiKey: "  sk-padded\n" }));
  assertEquals(decryptApiKey(db.rows[0].apiKeyEncrypted, parseEncryptionKey(KEY_A)!), "sk-padded");
  await svc.update("1", bedrock({ apiKey: "\tsk-new " }));
  assertEquals(decryptApiKey(db.rows[0].apiKeyEncrypted, parseEncryptionKey(KEY_A)!), "sk-new");
});

Deno.test("an absent apiKey on update keeps the stored key only when provider and base URL are unchanged", async () => {
  const { db, svc } = setup();
  const b = await svc.create(bedrock({ name: "Prod" }));
  const stored = db.rows[0].apiKeyEncrypted;
  // name-only, model-only and region-only edits keep the key
  await svc.update(String(b.id), bedrock({ name: "Prod renamed", apiKey: undefined }));
  assertEquals(db.rows[0].name, "Prod renamed");
  assertEquals(db.rows[0].apiKeyEncrypted, stored);
  await svc.update(String(b.id), bedrock({ model: "m2", apiKey: undefined }));
  await svc.update(String(b.id), bedrock({ model: "m2", region: "eu-west-1", apiKey: undefined }));
  assertEquals(db.rows[0].apiKeyEncrypted, stored);
  assertEquals(db.rows[0].region, "eu-west-1");
  // provider change -> _KEY_REQUIRED
  await expectError(
    svc.update(String(b.id), anthropic({ apiKey: undefined })),
    400,
    "AI_CONFIG_KEY_REQUIRED",
  );
  assertEquals(db.rows[0].provider, "bedrock");

  // workspace-only edit keeps the key; base URL change does not
  const a = await svc.create(anthropic({ workspaceId: "w1" }));
  const aStored = db.rows[1].apiKeyEncrypted;
  await svc.update(String(a.id), anthropic({ workspaceId: "w2", apiKey: undefined }));
  assertEquals(db.rows[1].apiKeyEncrypted, aStored);
  const o = await svc.create(openai());
  await expectError(
    svc.update(String(o.id), openai({ baseUrl: "https://y/v1", apiKey: undefined })),
    400,
    "AI_CONFIG_KEY_REQUIRED",
  );
  // trimmed base URL equals stored -> kept
  await svc.update(String(o.id), openai({ baseUrl: " https://x/v1 ", apiKey: undefined, model: "gpt2" }));

  // a new key replaces the ciphertext
  await svc.update(String(b.id), bedrock({ model: "m2", region: "eu-west-1", apiKey: "new-key" }));
  assertNotEquals(db.rows[0].apiKeyEncrypted, stored);
});

Deno.test("an absent apiKey is rejected when the stored key is unreadable", async () => {
  const { db, svc } = setup(KEY_A);
  const b = await svc.create(bedrock());
  const other = new TestService(db, KEY_B);
  await expectError(
    other.update(String(b.id), bedrock({ apiKey: undefined, model: "m2" })),
    400,
    "AI_CONFIG_KEY_REQUIRED",
  );
  // a real new key works
  await other.update(String(b.id), bedrock({ apiKey: "fresh", model: "m2" }));
  assertEquals(decryptApiKey(db.rows[0].apiKeyEncrypted, parseEncryptionKey(KEY_B)!), "fresh");
});

Deno.test("PUT with isActive -> 400 field isActive; echoing the GET response minus isActive works", async () => {
  const { db, svc } = setup();
  const c = await svc.create(bedrock());
  await expectError(
    svc.update(String(c.id), { ...bedrock({ apiKey: undefined }), isActive: false }),
    400,
    "AI_CONFIG_INVALID",
    "isActive",
  );
  await expectError(
    svc.update(String(c.id), { ...bedrock({ apiKey: undefined }), isActive: true }),
    400,
    "AI_CONFIG_INVALID",
    "isActive",
  );
  db.allowPool = true;
  // Other properties are ignored: echo the GET response (id, keyReadable, nulls) minus isActive
  const echoed = { ...(await svc.list())[0] } as Record<string, unknown>;
  delete echoed.isActive;
  echoed.keyReadable = false; // sent back by a client, but ignored; the stored key is still readable
  echoed.model = "edited";
  echoed.unknownProp = "ignored";
  const out = await svc.update(String(c.id), echoed);
  assertEquals(out.model, "edited");
  assertEquals(out.id, c.id);
  assertEquals(out.name, c.name);
  assertEquals(db.rows[0].id, c.id);
  assertEquals(db.rows.length, 1);
  assertFalse("keyReadable" in out);
});

Deno.test("an absent apiKey after a provider or base URL change is rejected and the stored key stays", async () => {
  const { db, svc } = setup();
  const b = await svc.create(bedrock());
  const o = await svc.create(openai());
  const stored = db.rows.map((r) => r.apiKeyEncrypted);
  await expectError(
    svc.update(String(b.id), anthropic({ apiKey: undefined })),
    400,
    "AI_CONFIG_KEY_REQUIRED",
  );
  await expectError(
    svc.update(String(o.id), openai({ baseUrl: "https://other/v1", apiKey: undefined })),
    400,
    "AI_CONFIG_KEY_REQUIRED",
  );
  assertEquals(db.rows.map((r) => r.apiKeyEncrypted), stored);
  assertEquals(db.rows[0].provider, "bedrock");
  assertEquals(db.rows[1].baseUrl, "https://x/v1");
});

Deno.test("a missing key on a provider change is reported before a duplicate name", async () => {
  const { svc } = setup();
  await svc.create(bedrock({ name: "A" }));
  const b = await svc.create(bedrock({ name: "B" }));
  await expectError(
    svc.update(String(b.id), anthropic({ name: "A", apiKey: undefined })),
    400,
    "AI_CONFIG_KEY_REQUIRED",
  );
});

Deno.test("responses never carry apiKey, plaintext or ciphertext", async () => {
  const { db, svc } = setup();
  const c = await svc.create(bedrock({ apiKey: "sk-plain-1" }));
  const u = await svc.update(String(c.id), bedrock({ model: "m9", apiKey: undefined }));
  db.allowPool = true;
  for (const out of [c, u, ...(await svc.list())]) {
    assertFalse("apiKey" in out);
    const text = JSON.stringify(out);
    assertFalse(text.includes("sk-plain-1"));
    assertFalse(text.includes(db.rows[0].apiKeyEncrypted as string));
  }
});

// ----------------------------------------------------------------- Uniqueness

Deno.test("duplicate name on create -> 409 field name, from the pre-check", async () => {
  const { db, svc } = setup();
  await svc.create(bedrock({ name: "Prod" }));
  // a different provider and settings do not matter: the name alone is the key
  await expectPreCheckDuplicate(db, () => svc.create(anthropic({ name: "Prod" })), "manager.insert");
  assertEquals(db.rows.length, 1);
});

Deno.test("duplicate name on update to another row's name -> 409 field name, from the pre-check", async () => {
  const { db, svc } = setup();
  await svc.create(bedrock({ name: "Prod" }));
  const b = await svc.create(bedrock({ name: "Staging" }));
  await expectPreCheckDuplicate(
    db,
    () => svc.update(String(b.id), bedrock({ name: "Prod", apiKey: "k" })),
    "manager.update",
  );
  assertEquals(db.rows.map((r) => r.name), ["Prod", "Staging"]);
});

Deno.test("updating a config with its own name -> 200", async () => {
  const { db, svc } = setup();
  const a = await svc.create(bedrock({ name: "Prod" }));
  await svc.create(bedrock({ name: "Staging" }));
  const out = await svc.update(String(a.id), bedrock({ name: "Prod", model: "m2", apiKey: "k2" }));
  assertEquals([out.name, out.model], ["Prod", "m2"]);
  // a padded own name is trimmed to the same name
  assertEquals((await svc.update(String(a.id), bedrock({ name: " Prod  ", apiKey: "k3" }))).name, "Prod");
});

Deno.test("names are case-sensitive: \"Prod\" and \"prod\" coexist", async () => {
  const { db, svc } = setup();
  await svc.create(bedrock({ name: "Prod" }));
  await svc.create(bedrock({ name: "prod" }));
  assertEquals(db.rows.map((r) => r.name), ["Prod", "prod"]);
});

Deno.test("a padded name is stored trimmed and clashes with the trimmed name", async () => {
  const { db, svc } = setup();
  const p = await svc.create(bedrock({ name: "  Prod " }));
  assertEquals(db.rows[0].name, "Prod");
  await expectPreCheckDuplicate(db, () => svc.create(bedrock({ name: "Prod" })), "manager.insert");
  await expectPreCheckDuplicate(db, () => svc.create(bedrock({ name: "Prod\n" })), "manager.insert");
  assertEquals(p.name, "Prod");
});

Deno.test("identical settings under different names both succeed", async () => {
  const { db, svc } = setup();
  const a = await svc.create(openai({ name: "Prod" }));
  const b = await svc.create(openai({ name: "Prod backup" }));
  assertNotEquals(a.id, b.id);
  assertEquals(db.rows.length, 2);
  const settings = (r: Record<string, unknown>) => [r.provider, r.model, r.baseUrl, r.region, r.workspaceId];
  assertEquals(settings(db.rows[0]), settings(db.rows[1]));
});

Deno.test("a race that reaches the name index is mapped to 409 and rolled back", async () => {
  const { db, svc } = setup();
  db.failNextInsertWith = Object.assign(new Error("dup"), {
    code: "23505",
    constraint: "ai_config_name_idx",
  });
  await expectError(svc.create(bedrock()), 409, "AI_CONFIG_DUPLICATE", "name");
  assertEquals([db.rollbacks, db.releases], [1, 1]);
});

// ------------------------------------------------------------------ Activation

Deno.test("activation: first create is active, later ones are not; activate moves it", async () => {
  const { db, svc } = setup();
  const a = await svc.create(bedrock());
  const b = await svc.create(bedrock({ region: "eu-west-1" }));
  assertEquals([a.isActive, b.isActive], [true, false]);
  const act = await svc.activate(String(b.id));
  assertEquals(act.isActive, true);
  assertEquals(db.rows.map((r) => r.isActive), [false, true]);
  // activating the already-active row is a 200 no-op (no writes)
  db.reset();
  const again = await svc.activate(String(b.id));
  assertEquals(again.isActive, true);
  assertFalse(db.queries.includes("manager.update"));
});

Deno.test("activation: a create when none is active is made active (repairs a lost active row)", async () => {
  const { db, svc } = setup();
  await svc.create(bedrock());
  db.rows[0].isActive = false;
  const c = await svc.create(bedrock({ region: "eu-west-1" }));
  assertEquals(c.isActive, true);
  assertEquals(db.rows.filter((r) => r.isActive).length, 1);
});

Deno.test("activate with an unknown id -> 404 and the active row is unchanged", async () => {
  const { db, svc } = setup();
  await svc.create(bedrock());
  await svc.create(bedrock({ region: "eu-west-1" }));
  db.reset();
  await expectError(svc.activate("999"), 404, "AI_CONFIG_NOT_FOUND");
  assertEquals(db.rows.map((r) => r.isActive), [true, false]);
  assertFalse(db.queries.includes("manager.update"));
  assertEquals(db.queries[0], LOCK_SQL);
});

Deno.test("activate sets modified_by on both changed rows", async () => {
  const db = setup().db;
  const creator = new TestService(db, KEY_A, "admin-a");
  await creator.create(bedrock());
  const b = await creator.create(bedrock({ region: "eu-west-1" }));
  assertEquals(db.rows.map((r) => r.modifiedBy), ["admin-a", "admin-a"]);
  await new TestService(db, KEY_A, "admin-b").activate(String(b.id));
  assertEquals(db.rows.map((r) => r.isActive), [false, true]);
  assertEquals(db.rows.map((r) => r.modifiedBy), ["admin-b", "admin-b"]);
  assertEquals(db.rows.map((r) => r.createdBy), ["admin-a", "admin-a"]);
});

Deno.test("activate writes clear-then-set as two statements", async () => {
  const { db, svc } = setup();
  await svc.create(bedrock());
  const b = await svc.create(bedrock({ region: "eu-west-1" }));
  db.reset();
  await svc.activate(String(b.id));
  assertEquals(db.queries.filter((q) => q === "manager.update").length, 2);
});

Deno.test(":id edge cases -> 404 _NOT_FOUND with no DB call", async () => {
  const { db, svc } = setup();
  db.allowPool = true;
  for (const id of ["abc", "0", "-1", "99999999999", "2147483648", "1.5", "", " 1", "1e3", "01"]) {
    for (
      const op of [
        () => svc.update(id, bedrock()),
        () => svc.activate(id),
        () => svc.delete(id, undefined),
      ]
    ) {
      await expectError(op(), 404, "AI_CONFIG_NOT_FOUND");
    }
  }
  assertEquals(db.runnersCreated, 0);
  assertEquals(db.poolCalls, []);
  assertEquals(db.queries, []);
  // int4 max is a valid id (just unknown)
  await expectError(svc.activate("2147483647"), 404, "AI_CONFIG_NOT_FOUND");
});

// --------------------------------------------------------------------- Delete

Deno.test("delete rules", async () => {
  const { db, svc } = setup();
  const a = await svc.create(bedrock());
  const b = await svc.create(bedrock({ region: "eu-west-1" }));
  await expectError(svc.delete(String(a.id), undefined), 400, "AI_CONFIG_ACTIVE_DELETE");
  assertEquals(db.rows.length, 2);
  await expectError(svc.delete("999", undefined), 404, "AI_CONFIG_NOT_FOUND");
  assertEquals(await svc.delete(String(b.id), undefined), { id: b.id }); // not active
  assertEquals(await svc.delete(String(a.id), undefined), { id: a.id }); // last, active
  assertEquals(db.rows.length, 0);
  // none active afterwards; the next create is made active
  assertEquals((await svc.create(bedrock())).isActive, true);
});

Deno.test("delete with newActiveId: replaces the active row, or a non-active one (caller's choice wins)", async () => {
  const { db, svc } = setup();
  const a = await svc.create(bedrock());
  const b = await svc.create(bedrock({ region: "eu-west-1" }));
  const c = await svc.create(bedrock({ region: "ap-1" }));
  assertEquals(
    await svc.delete(String(a.id), String(b.id)),
    { id: a.id },
  );
  assertEquals(db.rows.map((r) => [r.id, r.isActive]), [[b.id, true], [c.id, false]]);
  // b is active; deleting the non-active c while naming b keeps b active
  await svc.delete(String(c.id), String(b.id));
  assertEquals(db.rows.map((r) => [r.id, r.isActive]), [[b.id, true]]);
  // another admin switched active meanwhile: deleting non-active d with newActiveId e activates e
  const d = await svc.create(bedrock());
  const e = await svc.create(bedrock());
  await svc.delete(String(d.id), String(e.id));
  assertEquals(db.rows.filter((r) => r.isActive).map((r) => r.id), [e.id]);
});

Deno.test("delete with an invalid newActiveId -> 400 _INVALID field newActiveId, nothing changes", async () => {
  const { db, svc } = setup();
  const a = await svc.create(bedrock());
  await svc.create(bedrock());
  const before = JSON.stringify(db.rows);
  for (const bad of [String(a.id), "999", "abc", "0", "-1"]) {
    await expectError(svc.delete(String(a.id), bad), 400, "AI_CONFIG_INVALID", "newActiveId");
  }
  assertEquals(JSON.stringify(db.rows), before);
  // unknown :id wins with a valid-looking newActiveId; empty string counts as absent
  await expectError(svc.delete("999", "2"), 404, "AI_CONFIG_NOT_FOUND");
  await expectError(svc.delete(String(a.id), ""), 400, "AI_CONFIG_ACTIVE_DELETE");
});

Deno.test("delete audit: the new active row gets modified_by = the caller and it changed", async () => {
  const { db, svc } = setup();
  const a = await svc.create(bedrock());
  const b = await svc.create(bedrock());
  db.rows.find((r) => r.id === b.id)!.modifiedBy = "someone-else";
  await svc.delete(String(a.id), String(b.id));
  assertEquals(db.rows.find((r) => r.id === b.id)!.modifiedBy, "tester");
});

// ------------------------------------------------------------ Response / reads

Deno.test("response shape is redacted and omits audit columns, ciphertext and keyReadable when readable", async () => {
  const { db, svc } = setup();
  const c = await svc.create(openai({ name: "Prod" }));
  assertEquals(c, {
    id: 1,
    name: "Prod",
    provider: "openai-compatible",
    model: "gpt",
    baseUrl: "https://x/v1",
    region: null,
    workspaceId: null,
    isActive: true,
  });
  assertFalse("keyReadable" in c);
  assertFalse("apiKey" in c);
  assertEquals(db.rows[0].createdBy, "tester");
  assertEquals(db.rows[0].modifiedBy, "tester");
});

Deno.test("list is ordered by id (pool-bound reads only)", async () => {
  const { db, svc } = setup();
  await svc.create(bedrock());
  await svc.create(anthropic());
  await svc.create(openai());
  db.allowPool = true;
  db.reset();
  const list = await svc.list();
  assertEquals(list.map((r) => r.id), [1, 2, 3]);
  assertEquals(list[1].provider, "anthropic");
  assertEquals(db.runnersCreated, 0);
});

// ------------------------------------------------------------- Encryption key

Deno.test("encryption key unset, empty, not 32 bytes: reads 200 keyReadable false, create/update 500, activate/delete work", async () => {
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

    await expectError(degraded.create(bedrock({ region: "ap-1" })), 500, "AI_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED");
    await expectError(degraded.update(String(a.id), bedrock({ model: "x" })), 500, "AI_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED");
    // the key check comes first, before :id parsing and validation
    await expectError(degraded.update("abc", bedrock({ apiKey: undefined })), 500, "AI_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED");
    await expectError(degraded.update(String(a.id), { provider: "nope" }), 500, "AI_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED");
    await expectError(
      degraded.update(String(a.id), bedrock({ apiKey: undefined })),
      500,
      "AI_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED",
    );
    await expectError(degraded.create(bedrock({ apiKey: undefined })), 500, "AI_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED");

    // activate and delete do not need the key
    assertEquals((await degraded.activate(String(b.id))).isActive, true);
    assertEquals(await degraded.delete(String(a.id), undefined), { id: a.id });
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
  assertFalse("keyReadable" in (await svc.list())[0]);
  const wrong = new TestService(db, KEY_B);
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
    const c = await svc.create(bedrock({ name: "Leak", apiKey: "sk-leak-check" }));
    outputs.push(JSON.stringify(c));
    db.allowPool = true;
    outputs.push(JSON.stringify(await svc.list()));
    outputs.push(JSON.stringify(await svc.update("1", bedrock({ name: "Leak", apiKey: "sk-leak-2", model: "z" }))));
    for (
      const p of [
        svc.create(bedrock({ name: "Leak", model: "z", apiKey: "sk-leak-3" })), // duplicate
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
  assertEquals(db.asyncDataSourceCalls, 3);
});
