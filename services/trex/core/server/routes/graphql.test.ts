// Run from services/trex (its deno.json sets nodeModulesDir:auto so npm deps resolve):
//   LOGTO__ISSUER=https://logto.example.com/oidc \
//     deno test --no-check --allow-env --allow-read --allow-net core/server/routes/graphql.test.ts
//
// LOGTO__ISSUER is required only because the imported `authn.ts` builds a remote
// JWKS at module load — it is unrelated to the GraphQL route under test.
//
// Scope note (Task 4): there is no running Postgres in the unit environment, so
// this test asserts module *shape* and configuration only — that the module
// exports `addRoutes`, mounts at the expected `/trex/graphql` path, and resolves
// schemas from env. Live introspection / CRUD against the `notebook` schema is
// verified in Task 7.
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { addRoutes, GRAPHQL_PATH, getSchemas } from "./graphql.ts";

Deno.test("graphql route — exports addRoutes function", () => {
  assertExists(addRoutes);
  assertEquals(typeof addRoutes, "function");
});

Deno.test("graphql route — configured graphqlPath is /trex/graphql", () => {
  assertEquals(GRAPHQL_PATH, "/trex/graphql");
});

Deno.test("graphql route — getSchemas defaults to ['notebook']", () => {
  Deno.env.delete("GRAPHQL_PG_SCHEMA");
  assertEquals(getSchemas(), ["notebook"]);
});

Deno.test("graphql route — getSchemas reads comma-separated GRAPHQL_PG_SCHEMA", () => {
  Deno.env.set("GRAPHQL_PG_SCHEMA", "notebook, strategus");
  assertEquals(getSchemas(), ["notebook", "strategus"]);
  Deno.env.delete("GRAPHQL_PG_SCHEMA");
});

Deno.test("graphql route — addRoutes registers /trex/graphql on the app", () => {
  // Use a minimal Hono stand-in that records registered routes so we don't need
  // the full Hono runtime / a live PostGraphile instance for this assertion.
  const registered: string[] = [];
  const fakeApp = {
    all(path: string, ..._handlers: unknown[]) {
      registered.push(path);
    },
  } as unknown as Parameters<typeof addRoutes>[0];

  addRoutes(fakeApp);
  assertEquals(registered.includes(GRAPHQL_PATH), true);
});
