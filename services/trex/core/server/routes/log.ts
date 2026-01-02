import { authn } from "../auth/authn.ts";
import { authz } from "../auth/authz.ts";
import { env, logger } from "../env.ts";
import { Hono, Context } from "npm:hono";
import { HTTPException } from "npm:hono/http-exception";
import jwt from "npm:jsonwebtoken";

export function addRoutes(app: Hono) {
  app.post("/trex/log", authn, authz, async (c: Context) => {
    const body = await c.req.json();
    const { response } = body;

    if (!response) {
      throw new HTTPException(400, {
        res: new Response("Log response is missing in the request body", {
          status: 400,
        }),
      });
    }

    const bearerToken = c.req.raw.headers.get("authorization");
    const thirdPartyToken = jwt.decode(bearerToken.split(" ")[1])["thirdPartyToken"];
    const token = jwt.decode(thirdPartyToken);
    const idpUserId = token["oid"] || token["sub"];

    logger.info(
      `[Data2Evidence][AUDITLOG][${Date.now()}] Usage agreement ${response} by user: ${idpUserId}`
    );
    return c.json({ message: "success" });
  });
}
