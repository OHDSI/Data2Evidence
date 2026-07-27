import { installTrexGlobal } from "../../_shared/testing/trex-global.ts";

// Must run before any module under test evaluates: env.ts calls
// Deno.env.toObject() and JSON.parse(SERVICE_ROUTES) at module scope, and
// ShinyLiveService (constructed by DatasetRouter's own constructor) calls
// JSON.parse(env.PG__SSL.toLowerCase()), which throws when PG__SSL is unset.
//
// SERVICE_ROUTES must carry every key the dataset sources read; each API-client
// constructor throws "No url is set for ..." when its key is missing, and the
// route handlers swallow that throw in a try/catch, which would make a test
// pass for the wrong reason. Keys below are every `services.<key>` reference in
// the plugin source — note PortalAPI reads `portalServer`, not `portal`.
Deno.env.set(
  "SERVICE_ROUTES",
  JSON.stringify({
    analytics: "http://analytics.test", // AnalyticsSvcAPI
    portalServer: "http://portal-server.test", // PortalAPI
    jobplugins: "http://jobplugins.test", // JobPluginsAPI
    fhirGateway: "http://fhir-gateway.test", // FhirGatewayAPI
    trex: "http://trex.test", // DbCredentialsAPI
    supabaseStorage: "http://supabase-storage.test", // ShinyLiveService
  }),
);
Deno.env.set("PG__SSL", "false");
Deno.env.set("PG__HOST", "localhost");
Deno.env.set("PG__PORT", "5432");
Deno.env.set("PG__DB_NAME", "test");
Deno.env.set("PG_USER", "test-user");
Deno.env.set("PG_PASSWORD", "test-password");
Deno.env.set("FHIR_DATABASE_CODE", "fhir-test");
Deno.env.set("NODE_ENV", "test");

installTrexGlobal();
