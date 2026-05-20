import { createRemoteJWKSet, jwtVerify } from "npm:jose";
import { Context } from "npm:hono";
import { env, publicURLs, logger } from "../env.ts";
import { getWebApiToken, getTokenSubject } from "./token-exchange.ts";

export type AuthcType = "logto";

const JWKS = createRemoteJWKSet(new URL(`${env.LOGTO_ISSUER}/jwks`));

export async function authn(c: Context, next: Function) {
  if (publicURLs.some((url) => new RegExp(url).test(c.req.path))) {
    await next();
    return;
  }

  const isWebApiRoute = c.req.path.startsWith("/WebAPI/");
  if (isWebApiRoute) {
    const token = extractToken(c);

    if (!token) {
      await next();
      return;
    }

    try {
      await jwtVerify(token, JWKS);
    } catch (err) {
      logger.error(`authn: invalid Logto token: ${err}`);
      return new Response("Authentication Token not valid", { status: 401 });
    }

    const webApiToken = await getWebApiToken(token);
    if (!webApiToken) {
      logger.error("authn: token exchange failed");
      return new Response(JSON.stringify({ error: "Token exchange failed" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    c.set("webApiToken", webApiToken);
    c.set("logtoSubject", getTokenSubject(token));
    await next();
    return;
  }

  const token = extractToken(c);

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await jwtVerify(token, JWKS);
  } catch (err: any) {
    logger.error(`authn: token validation failed: ${err}`);
    return new Response("Authentication Token not valid", { status: 401 });
  }

  c.set("logtoSubject", getTokenSubject(token));
  await next();
}

function extractToken(c: Context): string | null {
  const regex = /\b(Bearer|bearer|token)\b/;

  let authHeader = c.req.header("authorization");
  if (!authHeader) {
    authHeader = c.req.raw.headers.get("authorization") ?? undefined;
  }

  if (authHeader && authHeader.split(" ")[0].match(regex)) {
    return authHeader.split(" ")[1] || null;
  }

  const cookieHeader = c.req.header("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split("; ");
    for (const cookie of cookies) {
      if (cookie.startsWith("authtoken=")) {
        return cookie.split("=")[1];
      } else if (cookie.startsWith("fhirtoken=")) {
        const val = cookie.split("=")[1];
        return val.split(" ")[1] || null;
      }
    }
  }

  return null;
}
