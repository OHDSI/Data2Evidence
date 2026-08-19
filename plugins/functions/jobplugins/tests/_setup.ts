import { installTrexGlobal } from "../../_shared/testing/trex-global.ts";

// Must run before any module under test evaluates: src/env.ts calls
// Deno.env.toObject() and JSON.parse(SERVICE_ROUTES) at module scope, and
// src/db/datasource.ts calls JSON.parse(env.PG__SSL.toLowerCase()), which
// throws when PG__SSL is unset.
//
// SERVICE_ROUTES must carry every key the jobplugins API clients read; each
// constructor throws "No url is set for ..." when its key is missing, and the
// controllers swallow that throw in a try/catch, which would make a test pass
// for the wrong reason. Keys below are every `services.<key>` / `services[...]`
// reference in the plugin source.
Deno.env.set(
  "SERVICE_ROUTES",
  JSON.stringify({
    portalServer: "http://portal-server.test", // PortalServerAPI
    prefect: "http://prefect.test", // PrefectAPI
    analytics: "http://analytics.test", // AnalyticsSvcAPI
    idIssuerUrl: "http://id-issuer.test", // OpenIDAPI
    usermgmt: "http://usermgmt.test", // extractUsernameFromJwt
    "strategus-analysis": "http://strategus-analysis.test", // StrategusAnalysisApi
  }),
);
Deno.env.set("PG__SSL", "false");
Deno.env.set("PG__HOST", "localhost");
Deno.env.set("PG__PORT", "5432");
Deno.env.set("PG__DB_NAME", "test");
Deno.env.set("PG_ADMIN_USER", "test-user");
Deno.env.set("PG_ADMIN_PASSWORD", "test-password");
Deno.env.set("NODE_ENV", "test");

installTrexGlobal();
