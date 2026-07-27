import { installTrexGlobal } from "../../_shared/testing/trex-global.ts";

// Must run before any module under test evaluates: env.ts, datasource.ts and
// knexfile.ts all read Deno.env at module scope, and JSON.parse(PG__SSL) throws
// if PG__SSL is unset.
Deno.env.set("PG__SSL", "false");
Deno.env.set("SERVICE_ROUTES", JSON.stringify({ portal: "http://portal.test" }));
Deno.env.set("PG_HOST", "localhost");
Deno.env.set("PG_PORT", "5432");
Deno.env.set("PG_DATABASE", "test");
Deno.env.set("PG_USER", "test-user");
Deno.env.set("PG_PASSWORD", "test-password");
Deno.env.set("PG_SCHEMA", "test_schema");
Deno.env.set("NODE_ENV", "test");

installTrexGlobal();
