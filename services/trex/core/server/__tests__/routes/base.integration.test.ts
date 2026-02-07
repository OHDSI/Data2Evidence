/**
 * Integration tests for base routes:
 *   GET /_internal/health
 *   GET /_internal/metric
 *   GET /d2e/_internal/health  (path rewriting)
 */

// Must be first — sets globalThis.Trex before route modules load
import "../helpers/mock-trex-global.ts";
import { createTestApp } from "../helpers/setup.ts";
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

let app: any;

Deno.test({
  name: "base: setup",
  fn: async () => {
    app = await createTestApp({ routes: ["base"] });
    assertExists(app);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "GET /_internal/health returns 200 with ok message",
  fn: async () => {
    const res = await app.request("/_internal/health");
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.message, "ok");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "GET /_internal/metric returns 200 with metrics",
  fn: async () => {
    const res = await app.request("/_internal/metric");
    assertEquals(res.status, 200);
    const body = await res.json();
    assertExists(body);
    // Our mock returns { memory: 0, cpu: 0 }
    assertEquals(body.memory, 0);
    assertEquals(body.cpu, 0);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "GET /d2e/_internal/health rewrites path and returns 200",
  fn: async () => {
    // The app's getPath strips /d2e prefix, so /d2e/_internal/health → /_internal/health
    const res = await app.request("/d2e/_internal/health");
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.message, "ok");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
