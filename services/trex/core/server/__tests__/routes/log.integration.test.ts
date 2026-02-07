/**
 * Integration tests for log routes:
 *   POST /trex/log (with real JWT auth)
 *
 * Tests authn + authz middleware with real jose JWT verification
 * against a test RSA key pair with mocked JWKS endpoint.
 */

// 1. Mock Trex global
import "../helpers/mock-trex-global.ts";

// 2. Setup env + axios mocks (sets LOGTO_ISSUER before authn.ts loads)
import { createTestApp, mockAxios, restoreAxios } from "../helpers/setup.ts";

// 3. Setup JWT infrastructure
import { setupTestJwt } from "../helpers/test-jwt.ts";

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

let app: any;
let createTestToken: (claims?: Record<string, any>) => Promise<string>;
let cleanupJwksMock: () => void;

Deno.test({
  name: "log: setup",
  fn: async () => {
    const jwt = await setupTestJwt();
    createTestToken = jwt.createTestToken;
    cleanupJwksMock = jwt.cleanupJwksMock;

    // Install JWKS mock so createRemoteJWKSet can resolve our test keys
    jwt.installJwksMock();

    // Install axios mock for UserMgmtAPI.getUserGroups
    mockAxios();

    app = await createTestApp({ routes: ["log"] });
    assertExists(app);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "POST /trex/log without token returns 401",
  fn: async () => {
    const res = await app.request("/trex/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: "accepted" }),
    });
    assertEquals(res.status, 401);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "POST /trex/log with valid token and response returns 200",
  fn: async () => {
    const token = await createTestToken({ sub: "test-user-1" });
    const res = await app.request("/trex/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ response: "accepted" }),
    });
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.message, "success");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "POST /trex/log with valid token but missing response returns 400",
  fn: async () => {
    const token = await createTestToken({ sub: "test-user-2" });
    const res = await app.request("/trex/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    assertEquals(res.status, 400);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "log: cleanup",
  fn: () => {
    cleanupJwksMock();
    restoreAxios();
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
