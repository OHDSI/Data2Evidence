/**
 * Integration tests for portal routes:
 *   GET /portal/plugin.json
 *   GET /portal/env.js
 */

import "../helpers/mock-trex-global.ts";
import { createTestApp } from "../helpers/setup.ts";
import { global } from "../../env.ts";
import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

let app: any;

Deno.test({
  name: "portal: setup",
  fn: async () => {
    app = await createTestApp({ routes: ["portal"] });
    assertExists(app);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "GET /portal/plugin.json returns 200 with plugins JSON",
  fn: async () => {
    const res = await app.request("/portal/plugin.json");
    assertEquals(res.status, 200);
    const body = await res.json();
    // Default PLUGINS_JSON is "{}" (a string), returned via c.json()
    assertEquals(body, global.PLUGINS_JSON);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "GET /portal/env.js returns 200 with window.ENV_DATA JavaScript",
  fn: async () => {
    const res = await app.request("/portal/env.js");
    assertEquals(res.status, 200);

    const contentType = res.headers.get("Content-Type");
    assertExists(contentType);
    assertStringIncludes(contentType, "javascript");

    const text = await res.text();
    assertStringIncludes(text, "window.ENV_DATA");
    assertStringIncludes(text, "PUBLIC_URL");
    assertStringIncludes(text, "/d2e/portal");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
