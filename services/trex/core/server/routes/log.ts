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
    const logtoToken = jwt.decode(bearerToken.split(" ")[1]);
    try { 
      const thirdPartyToken = logtoToken["thirdPartyToken"];
      const token = jwt.decode(thirdPartyToken);
      const idpUserId = token["sub"] || token["oid"];

      logger.info(
        `[Data2Evidence][AUDITLOG][${Date.now()}] Usage agreement ${response} by user: ${idpUserId}`
      );
      return c.json({ message: "success" });
    } catch (error) {
      logger.info(`${error.message}`)
      return c.json({ message: "Failed to log the usage agreement consent" });
    }
  });
}
