import { env, logger } from "./env.ts";
import { postgraphile } from "postgraphile";
import { PostGraphileAmberPreset } from "postgraphile/presets/amber";
import { makePgService } from "postgraphile/adaptors/pg";
import { grafserv } from "postgraphile/grafserv/hono/v4";
import { authn } from "./auth/authn.ts";
import { authz } from "./auth/authz.ts";
import { Hono } from "npm:hono";
import jwt from "npm:jsonwebtoken";

export async function addGraphQL(app: Hono) {
  logger.log("Initializing PostGraphile...");

  const connectionString = `postgres://${encodeURIComponent(env.PG__USER)}:${encodeURIComponent(env.PG__PASSWORD)}@${env.PG__HOST}:${env.PG__PORT}/${env.PG__DB_NAME}`;

  const preset = {
    extends: [PostGraphileAmberPreset],
    pgServices: [
      makePgService({
        connectionString,
        schemas: ["trex"],
      }),
    ],
    grafserv: {
      graphqlPath: "/trex/graphql",
      graphiqlPath: "/trex/graphiql",
      graphqlOverGET: false,
      watch: false,
    },
    grafast: {
      context(requestContext: any) {
        const honoCtx = requestContext?.honov4?.ctx;
        if (!honoCtx) return {};

        // Primary: user stored by authz middleware
        const user = honoCtx.get?.("user");
        if (user) {
          return {
            pgSettings: {
              "role": "trex_graphql_user",
              "app.user_id": user.userId || "",
              "app.user_email": user.email || "",
              "app.user_name": user.name || "",
              "app.user_roles": JSON.stringify(user.roles || []),
              "app.tenant_ids": JSON.stringify(user.tenantIds || []),
            },
          };
        }

        // Fallback: decode from Authorization header (for internal app.fetch() calls
        // where a fresh Hono context is created and authz may not have stored the user)
        const authHeader = honoCtx.req?.header?.("authorization");
        if (authHeader) {
          const token = jwt.decode(authHeader.replace(/bearer /i, "").trim());
          if (token?.sub) {
            return {
              pgSettings: {
                "role": "trex_graphql_user",
                "app.user_id": token.sub,
                "app.user_email": token.email || "",
                "app.user_name": token.name || "",
                "app.user_roles": honoCtx.req?.header?.("x-user-roles") || "[]",
                "app.tenant_ids": JSON.stringify(
                  token.userMgmtGroups?.alp_tenant_id || []
                ),
              },
            };
          }
        }

        return {};
      },
    },
  };

  const pgl = postgraphile(preset);
  const serv = pgl.createServ(grafserv);

  app.use("/trex/graphql", authn, authz);
  app.use("/trex/graphiql", authn, authz);

  serv.addTo(app);
  logger.log("PostGraphile mounted at /trex/graphql");
}
