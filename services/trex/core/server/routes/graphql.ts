import { Hono, Context } from "npm:hono";
import { postgraphile } from "npm:postgraphile";
import { PostGraphileAmberPreset } from "npm:postgraphile/presets/amber";
import { makePgService } from "npm:postgraphile/adaptors/pg";
// grafserv ships a native Hono (Fetch/Web) adaptor. PostGraphile re-exports it
// under `postgraphile/grafserv/hono/v4`. Unlike the express adaptor used
// upstream, this adaptor speaks the Fetch API (Request -> Response) so it can be
// driven directly from a Hono `Context` — exactly what d2e's Hono server needs.
import { grafserv } from "npm:postgraphile/grafserv/hono/v4";
import { PostGraphileConnectionFilterPreset } from "npm:postgraphile-plugin-connection-filter";
import { env, logger } from "../env.ts";
import { authn } from "../auth/authn.ts";

// GraphQL endpoint path. NOTE: the Hono app strips a leading `/d2e/`, but the
// `/trex/...` prefix is used directly (see index.ts getPath()).
export const GRAPHQL_PATH = "/trex/graphql";

/**
 * Build the Postgres connection string for PostGraphile.
 *
 * d2e's `alp` database has no Supabase `authenticator`/RLS role, so — unlike
 * upstream trex — we connect as the admin `PG__USER`. The plan (Task 4) keeps
 * the upstream Amber + connection-filter presets but drops the per-request
 * `SET ROLE` / RLS machinery.
 */
function buildDatabaseUrl(): string {
  const user = encodeURIComponent(env.PG__USER ?? "");
  const password = encodeURIComponent(env.PG__PASSWORD ?? "");
  const host = env.PG__HOST;
  const port = env.PG__PORT;
  const dbName = env.PG__DB_NAME;
  return `postgres://${user}:${password}@${host}:${port}/${dbName}`;
}

/** Schemas exposed by the GraphQL API (default: `notebook`). */
export function getSchemas(): string[] {
  return (Deno.env.get("GRAPHQL_PG_SCHEMA") ?? "notebook")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const graphiqlEnabled = Deno.env.get("ENABLE_GRAPHIQL") === "true";

/** Lazily-instantiated grafserv instance (one per process). */
let servInstance: ReturnType<typeof createServ> | null = null;

function createServ() {
  const connectionString = Deno.env.get("GRAPHQL_DATABASE_URL") ||
    buildDatabaseUrl();
  const schemas = getSchemas();

  const pgl = postgraphile({
    extends: [PostGraphileAmberPreset, PostGraphileConnectionFilterPreset],
    pgServices: [
      makePgService({
        connectionString,
        schemas,
      }),
    ],
    grafserv: {
      graphqlPath: GRAPHQL_PATH,
      graphiqlPath: `${GRAPHQL_PATH}/../graphiql`,
      graphiql: graphiqlEnabled,
    },
  });

  // The Hono adaptor exposes `handleGraphQLEvent(ctx)` which reads the request
  // body / headers straight off the Hono `Context` and returns a Response.
  return pgl.createServ(grafserv);
}

function getServ() {
  if (!servInstance) {
    servInstance = createServ();
  }
  return servInstance;
}

/**
 * Register the PostGraphile GraphQL endpoint on the Hono `app`.
 *
 * The route is gated behind the existing `authn` middleware (bearer token
 * required), consistent with other authenticated d2e routes. The grafserv Hono
 * adaptor's `handleGraphQLEvent` is invoked with the Hono context directly.
 */
export function addRoutes(app: Hono) {
  app.all(GRAPHQL_PATH, authn, async (c: Context) => {
    try {
      const serv = getServ();
      return await serv.handleGraphQLEvent(c);
    } catch (e) {
      logger.error(`GraphQL handler error: ${(e as Error).message}`);
      return new Response(
        JSON.stringify({ errors: [{ message: "GraphQL handler error" }] }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  });

  logger.log(
    `Registered PostGraphile at ${GRAPHQL_PATH} (schemas: ${getSchemas().join(",")})`,
  );
}
