/**
 * Test app factory, env mocking, and axios mocking for integration tests.
 *
 * Import order matters:
 *   1. mock-trex-global.ts (sets globalThis.Trex before route imports)
 *   2. This module sets env vars before authn.ts reads LOGTO_ISSUER
 *   3. Install JWKS mock before authn.ts module loads (for createRemoteJWKSet)
 *
 * Usage:
 *   import "../helpers/mock-trex-global.ts";
 *   import { createTestApp, mockAxios, restoreAxios } from "../helpers/setup.ts";
 */

import { env, global } from "../../env.ts";
import axios from "npm:axios";

// ── Env overrides ──────────────────────────────────────────────────────
// These must be set before authn.ts is imported (it reads LOGTO_ISSUER at module level)
export const TEST_ISSUER = "https://test-logto.example.com/oidc";

Object.defineProperty(env, "LOGTO_ISSUER", { value: TEST_ISSUER, writable: true, configurable: true });
Object.defineProperty(env, "LOGTO_AUDIENCES", { value: "https://test-api.example.com", writable: true, configurable: true });
Object.defineProperty(env, "GATEWAY_WO_PROTOCOL_FQDN", { value: "localhost", writable: true, configurable: true });
Object.defineProperty(env, "GATEWAY_IDP_SUBJECT_PROP", { value: "sub", writable: true, configurable: true });
Object.defineProperty(env, "LOGTO_CLIENT_ID", { value: "test-client-id", writable: true, configurable: true });
Object.defineProperty(env, "LOGTO_SCOPE", { value: "openid profile", writable: true, configurable: true });
Object.defineProperty(env, "APP_LOCALE", { value: "en", writable: true, configurable: true });
Object.defineProperty(env, "SERVICE_ROUTES", { value: { usermgmt: "http://mock-usermgmt" }, writable: true, configurable: true });
Object.defineProperty(env, "SERVICE_ENV", { value: {}, writable: true, configurable: true });
Object.defineProperty(env, "PLUGINS_SEED_UPDATE", { value: false, writable: true, configurable: true });
Object.defineProperty(env, "PREFECT_DOCKER_VOLUMES", { value: [], writable: true, configurable: true });
Object.defineProperty(env, "PG__HOST", { value: Deno.env.get("PG__HOST") || "localhost", writable: true, configurable: true });
Object.defineProperty(env, "PG__PORT", { value: Deno.env.get("PG__PORT") || "5432", writable: true, configurable: true });
Object.defineProperty(env, "PG__USER", { value: Deno.env.get("PG_MANAGE_USER") || "postgres", writable: true, configurable: true });
Object.defineProperty(env, "PG__PASSWORD", { value: Deno.env.get("PG_MANAGE_PASSWORD") || "postgres", writable: true, configurable: true });
Object.defineProperty(env, "PG__DB_NAME", { value: Deno.env.get("PG__DB_NAME") || "postgres", writable: true, configurable: true });
Object.defineProperty(env, "PG__SSL", { value: "false", writable: true, configurable: true });
Object.defineProperty(env, "DB_CREDENTIALS__PRIVATE_KEY", { value: "not-used-in-tests", writable: true, configurable: true });
Object.defineProperty(env, "PORTAL__LOG_DISCLAIMER", { value: "Test disclaimer", writable: true, configurable: true });
Object.defineProperty(env, "GIT_COMMIT", { value: "test-commit", writable: true, configurable: true });
Object.defineProperty(env, "IDP_RELYING_PARTY", { value: "test-rp", writable: true, configurable: true });
Object.defineProperty(env, "IDP_REQUIRED_CLAIM", { value: "email", writable: true, configurable: true });
Object.defineProperty(env, "DB_CREDENTIALS_PUBLIC_KEYS", { value: "", writable: true, configurable: true });
Object.defineProperty(env, "USE_PUBLIC_WEBAPI_PROXY", { value: "false", writable: true, configurable: true });
Object.defineProperty(env, "PUBLIC_WEBAPI_PROXY_URL", { value: "", writable: true, configurable: true });
Object.defineProperty(env, "PUBLIC_WEBAPI_DATASOURCE", { value: "", writable: true, configurable: true });

// ── Axios mock ─────────────────────────────────────────────────────────
const originalAxiosPost = axios.post;

/**
 * Install axios mock that intercepts UserMgmtAPI calls.
 * Returns user groups granting ALP_SYSTEM_ADMIN + TENANT_VIEWER.
 */
export function mockAxios() {
  Object.defineProperty(axios, "post", {
    value: async (url: string, data: any, config: any) => {
      if (url.includes("/user-group/list")) {
        return {
          data: {
            groups: ["group1"],
            alp_tenant_id: ["tenant-1"],
            alp_role_tenant_viewer: ["tenant-1"],
            alp_role_study_researcher: [],
            alp_role_system_admin: true,
            alp_role_user_admin: true,
            alp_role_dashboard_viewer: false,
          },
        };
      }
      return originalAxiosPost(url, data, config);
    },
    writable: true,
    configurable: true,
  });
}

export function restoreAxios() {
  Object.defineProperty(axios, "post", {
    value: originalAxiosPost,
    writable: true,
    configurable: true,
  });
}

// ── App factory ────────────────────────────────────────────────────────
import { Hono } from "npm:hono";

type RouteSet = "base" | "portal" | "log" | "dbm";

/**
 * Creates a Hono app with the requested route sets.
 * Does NOT call initTrex() — no DB, no plugins, no GraphQL unless explicitly added.
 */
export async function createTestApp(opts: { routes: RouteSet[] }): Promise<Hono> {
  const app = new Hono({
    getPath: (req: Request) => {
      const url = new URL(req.url);
      // Strip /d2e prefix just like the real app
      if (url.pathname.startsWith("/d2e/")) {
        return url.pathname.replace(/^\/d2e/, "") + url.search;
      }
      return url.pathname + url.search;
    },
  });

  for (const route of opts.routes) {
    switch (route) {
      case "base": {
        const { addRoutes } = await import("../../routes/base.ts");
        addRoutes(app);
        break;
      }
      case "portal": {
        const { addRoutes } = await import("../../routes/portal.ts");
        addRoutes(app);
        break;
      }
      case "log": {
        const { addRoutes } = await import("../../routes/log.ts");
        addRoutes(app);
        break;
      }
      case "dbm": {
        const { addRoutes } = await import("../../routes/dbm.ts");
        addRoutes(app);
        break;
      }
    }
  }

  return app;
}
