import { createRemoteJWKSet, jwtVerify } from "npm:jose";
import { Context } from "npm:hono";
import { env, publicURLs, logger } from "../env.ts";
import { getWebApiToken, getTokenSubject } from "./token-exchange.ts";

export type AuthcType = "logto";

const JWKS = createRemoteJWKSet(new URL(`${env.LOGTO_ISSUER}/jwks`));

export async function authn(c: Context, next: Function) {
  // Debug: log path info for all requests
  logger.info(`authn: path=${c.req.path}, url=${c.req.url}`);

  if (publicURLs.some((url) => new RegExp(url).test(c.req.path))) {
    await next();
    return;
  }

  // WebAPI routes: exchange Logto token for WebAPI token
  const isWebApiRoute = c.req.path.startsWith("/WebAPI/");
  logger.info(`authn: isWebApiRoute=${isWebApiRoute}`);
  if (isWebApiRoute) {
    const token = extractToken(c);

    if (!token) {
      logger.info(`authn: WebAPI request without token, path=${c.req.path}`);
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

    logger.info(`authn: token exchange successful for ${c.req.path}`);
    c.set("webApiToken", webApiToken);
    c.set("logtoSubject", getTokenSubject(token));
    await next();
    return;
  }

  // Non-WebAPI routes: require valid Logto token
  const token = extractToken(c);

  if (!token) {
    logger.error("authn: no token");
    return new Response("Unauthorized", { status: 401 });
  }

  // Debug: log token format (safe - not the actual token)
  const parts = token.split(".");
  logger.info(`authn: token format - parts=${parts.length}, lengths=[${parts.map(p => p.length).join(",")}]`);

  try {
    await jwtVerify(token, JWKS);
  } catch (err: any) {
    logger.error(`authn: token validation failed: ${err}`);
    // Log more details about the token for debugging
    logger.error(`authn: token starts with: ${token.substring(0, 20)}..., length=${token.length}`);
    return new Response("Authentication Token not valid", { status: 401 });
  }

  c.set("logtoSubject", getTokenSubject(token));
  await next();
}

function extractToken(c: Context): string | null {
  const regex = /\b(Bearer|bearer|token)\b/;

  // Try both Hono's method and raw request headers
  let authHeader = c.req.header("authorization");
  logger.info(`extractToken: c.req.header("authorization")=${authHeader ? "present" : "null"}`);
  if (!authHeader) {
    // Fallback: try getting from raw request headers
    authHeader = c.req.raw.headers.get("authorization");
    logger.info(`extractToken: c.req.raw.headers.get("authorization")=${authHeader ? "present" : "null"}`);
  }

  if (authHeader && authHeader.split(" ")[0].match(regex)) {
    logger.info(`extractToken: found Bearer token`);
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
        return val.split(" ")[1];
      }
    }
  }

  return null;
}
