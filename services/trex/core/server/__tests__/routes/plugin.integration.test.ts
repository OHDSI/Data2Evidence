/**
 * Integration tests for plugin routes:
 *   GET  /trex/plugins
 *   POST /trex/plugins/:name
 *   PUT  /trex/plugins/:name
 *   DELETE /trex/plugins/:name
 *
 * Covers: input validation, TPM result parsing, GET response shape,
 * connection caching, and scoped directory scanning.
 */

// 1. Mock Trex global
import "../helpers/mock-trex-global.ts";

// 2. Setup env + axios mocks
import { createTestApp, mockAxios, restoreAxios } from "../helpers/setup.ts";

// 3. Setup JWT infrastructure
import { setupTestJwt } from "../helpers/test-jwt.ts";

import { env } from "../../env.ts";
import { Plugins } from "../../plugin/plugin.ts";

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

let app: any;
let createTestToken: (claims?: Record<string, any>) => Promise<string>;
let cleanupJwksMock: () => void;

// Track SQL calls to the mock TrexDB
let executedSql: string[] = [];
let tpmInstallResponse: string | null = null; // null = use default
const originalTrexDB = (globalThis as any).Trex.TrexDB;

// ── Setup ─────────────────────────────────────────────────────────────

Deno.test({
  name: "plugin: setup",
  fn: async () => {
    // Set plugin-specific env vars
    Object.defineProperty(env, "PLUGINS_PATH", { value: "/tmp/test-plugins", writable: true, configurable: true });
    Object.defineProperty(env, "TPM_EXT_PATH", { value: "/tmp/test-tpm.duckdb_extension", writable: true, configurable: true });
    Object.defineProperty(env, "GH_ORG", { value: "data2evidence", writable: true, configurable: true });
    Object.defineProperty(env, "PLUGINS_API_VERSION", { value: "latest", writable: true, configurable: true });

    // Install a TrexDB mock that tracks SQL and returns realistic results
    (globalThis as any).Trex.TrexDB = class {
      constructor(_mode: string) {}
      async execute(sql: string, _params: any[]) {
        executedSql.push(sql);
        if (sql.includes("tpm_install")) {
          if (tpmInstallResponse !== null) return [tpmInstallResponse];
          return [JSON.stringify({ success: true, version: "1.0.0" })];
        }
        if (sql.includes("tpm_delete")) {
          return [JSON.stringify({ deleted: true })];
        }
        return [];
      }
    };

    const jwt = await setupTestJwt();
    createTestToken = jwt.createTestToken;
    cleanupJwksMock = jwt.cleanupJwksMock;
    jwt.installJwksMock();
    mockAxios();

    app = await createTestApp({ routes: ["plugin"] });
    assertExists(app);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// ── Validation tests ──────────────────────────────────────────────────

Deno.test({
  name: "POST /trex/plugins/:name rejects SQL injection attempt with 400",
  fn: async () => {
    const token = await createTestToken();
    const res = await app.request("/trex/plugins/foo';DROP--", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assertEquals(res.status, 400);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "POST /trex/plugins/:name rejects empty name with 400",
  fn: async () => {
    const token = await createTestToken();
    // Hono routes /trex/plugins/ with trailing slash to GET, so this tests the param validation
    const res = await app.request("/trex/plugins/%20", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assertEquals(res.status, 400);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "POST /trex/plugins/:name rejects names with slashes",
  fn: async () => {
    const token = await createTestToken();
    const res = await app.request("/trex/plugins/foo%2Fbar", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assertEquals(res.status, 400);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "POST /trex/plugins/:name accepts valid plugin names",
  fn: async () => {
    executedSql = [];
    const token = await createTestToken();
    const res = await app.request("/trex/plugins/my-plugin_v2.0", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.name, "my-plugin_v2.0");
    assertEquals(body.installed, true);
    assertEquals(body.active, false);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "DELETE /trex/plugins/:name rejects injection with 400",
  fn: async () => {
    const token = await createTestToken();
    const res = await app.request("/trex/plugins/foo'OR'1'='1", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    assertEquals(res.status, 400);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "PUT /trex/plugins/:name rejects injection with 400",
  fn: async () => {
    const token = await createTestToken();
    const res = await app.request("/trex/plugins/name;DROP TABLE", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    assertEquals(res.status, 400);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// ── Auth tests ────────────────────────────────────────────────────────

Deno.test({
  name: "POST /trex/plugins/:name without token returns 401",
  fn: async () => {
    const res = await app.request("/trex/plugins/test-plugin", {
      method: "POST",
    });
    assertEquals(res.status, 401);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// ── POST happy path ───────────────────────────────────────────────────

Deno.test({
  name: "POST /trex/plugins/:name installs and returns correct shape",
  fn: async () => {
    executedSql = [];
    const token = await createTestToken();
    const res = await app.request("/trex/plugins/test-plugin", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.name, "test-plugin");
    assertEquals(body.version, "1.0.0");
    assertEquals(body.installed, true);
    assertEquals(body.active, false);
    assertExists(body.message);

    // Verify the correct SQL was generated (no injection possible)
    const installSql = executedSql.find(s => s.includes("tpm_install"));
    assertExists(installSql);
    assertEquals(installSql!.includes("@data2evidence/test-plugin@latest"), true);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// ── PUT happy path (delete + install) ─────────────────────────────────

Deno.test({
  name: "PUT /trex/plugins/:name deletes then installs for clean overwrite",
  fn: async () => {
    executedSql = [];
    const token = await createTestToken();
    const res = await app.request("/trex/plugins/test-plugin", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.name, "test-plugin");
    assertEquals(body.installed, true);

    // Verify delete happens before install
    const deleteIdx = executedSql.findIndex(s => s.includes("tpm_delete"));
    const installIdx = executedSql.findIndex(s => s.includes("tpm_install"));
    assertEquals(deleteIdx >= 0, true, "tpm_delete should be called");
    assertEquals(installIdx >= 0, true, "tpm_install should be called");
    assertEquals(deleteIdx < installIdx, true, "tpm_delete should precede tpm_install");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// ── DELETE happy path ─────────────────────────────────────────────────

Deno.test({
  name: "DELETE /trex/plugins/:name removes and returns correct shape",
  fn: async () => {
    executedSql = [];
    const token = await createTestToken();
    const res = await app.request("/trex/plugins/test-plugin", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.name, "test-plugin");
    assertEquals(body.deleted, true);
    assertExists(body.message);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// ── Connection caching ────────────────────────────────────────────────

Deno.test({
  name: "Multiple requests reuse cached TPM connection (LOAD called once)",
  fn: async () => {
    executedSql = [];
    const token = await createTestToken();

    // Make two POST requests
    await app.request("/trex/plugins/plugin-a", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    await app.request("/trex/plugins/plugin-b", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    // LOAD should appear at most once (or zero if connection was already cached from earlier tests)
    const loadCalls = executedSql.filter(s => s.includes("LOAD"));
    assertEquals(loadCalls.length <= 1, true, `Expected at most 1 LOAD call, got ${loadCalls.length}`);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// ── GET response shape with installed field ───────────────────────────

Deno.test({
  name: "GET /trex/plugins?version=none returns plugins with installed field",
  fn: async () => {
    // Pre-populate the active registry with a test plugin
    Plugins.activeRegistry.set("active-plugin", {
      name: "active-plugin",
      version: "2.0.0",
      registeredAt: new Date(),
    });

    const token = await createTestToken();
    const res = await app.request("/trex/plugins?version=none", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assertEquals(res.status, 200);
    const body = await res.json();

    // The active-not-on-disk plugin should have installed: true
    const activePlugin = body.find((p: any) => p.name === "active-plugin");
    assertExists(activePlugin, "active-plugin should be in response");
    assertEquals(activePlugin.installed, true);
    assertEquals(activePlugin.active, true);
    assertEquals(activePlugin.pendingRestart, true);

    // Clean up
    Plugins.activeRegistry.delete("active-plugin");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// ── parseTpmResult error handling ─────────────────────────────────────

Deno.test({
  name: "POST with malformed TPM response returns 500",
  fn: async () => {
    // Use the controllable mock to return invalid JSON
    tpmInstallResponse = "not valid json {{{";

    const token = await createTestToken();
    const res = await app.request("/trex/plugins/valid-name", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    // parseTpmResult throws HTTPException(500), outer catch re-wraps as 500
    assertEquals(res.status, 500);

    // Restore default behavior
    tpmInstallResponse = null;
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// ── Cleanup ───────────────────────────────────────────────────────────

Deno.test({
  name: "plugin: cleanup",
  fn: () => {
    cleanupJwksMock();
    restoreAxios();
    (globalThis as any).Trex.TrexDB = originalTrexDB;
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
