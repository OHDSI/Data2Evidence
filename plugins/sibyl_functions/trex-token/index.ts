// @ts-nocheck - Deno edge function (trex EdgeRuntime).
//
// POST /trex-token — exchange a Logto access token for a trex-native HS256
// access token.
//
// trex core's /graphql (PostGraphile) and the x-user-id-gated function APIs
// authenticate exclusively via trex HS256 tokens (auth-context.ts). Under d2e
// the browser only holds a Logto RS256 token, which that middleware rejects,
// so every request runs as the grant-less `anon` Postgres role. This endpoint
// is the graphql counterpart of the d2e-compat WebAPI token exchange: it
// verifies the Logto token against the issuer JWKS and mints a trex access
// token for the same subject, expiring no later than the Logto token.
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

const ISSUER = Deno.env.get("LOGTO__ISSUER") ?? "";
const ROOT_KEY = Deno.env.get("TREX_ROOT_KEY") ?? "";

const encoder = new TextEncoder();

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function jwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!_jwks) _jwks = createRemoteJWKSet(new URL(`${ISSUER}/jwks`));
  return _jwks;
}

function b64decode(s: string): Uint8Array {
  const norm = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = norm.length % 4 === 0 ? norm : norm + "=".repeat(4 - (norm.length % 4));
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
}

function b64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Mirrors trex core auth/keys.ts + auth/jwt.ts: HKDF(root, salt "trex/v1",
// info "trex.jwt.hs256.v1") -> unpadded-base64 string whose ASCII bytes are
// the HMAC key.
let _hmacKey: CryptoKey | null = null;
async function hmacKey(): Promise<CryptoKey> {
  if (_hmacKey) return _hmacKey;
  const root = b64decode(ROOT_KEY).slice(0, 32);
  const material = await crypto.subtle.importKey("raw", root.buffer, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: encoder.encode("trex/v1"), info: encoder.encode("trex.jwt.hs256.v1") },
    material,
    256,
  );
  const secret = btoa(Array.from(new Uint8Array(bits), (b) => String.fromCharCode(b)).join("")).replace(/=+$/, "");
  _hmacKey = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return _hmacKey;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  if (!ISSUER || !ROOT_KEY) return json({ error: "NOT_CONFIGURED" }, 503);

  const auth = req.headers.get("authorization") ?? "";
  const logtoToken = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!logtoToken) return json({ error: "UNAUTHORIZED" }, 401);

  let payload: Record<string, unknown>;
  try {
    ({ payload } = await jwtVerify(logtoToken, jwks(), { issuer: ISSUER }));
  } catch {
    return json({ error: "INVALID_TOKEN" }, 401);
  }
  const sub = typeof payload.sub === "string" ? payload.sub : null;
  if (!sub) return json({ error: "INVALID_TOKEN" }, 401);

  // System-admin detection mirrors trex d2e-compat requireAdmin: either the
  // legacy userMgmtGroups flag or this stack's roles array.
  const roles = payload.roles;
  const userMgmtGroups = payload.userMgmtGroups as Record<string, unknown> | undefined;
  const isAdmin = (Array.isArray(roles) && roles.includes("role.systemadmin")) ||
    userMgmtGroups?.["alp_role_system_admin"] === true;

  const now = Math.floor(Date.now() / 1000);
  const logtoExp = typeof payload.exp === "number" ? payload.exp : now + 3600;
  const exp = Math.min(logtoExp, now + 3600);
  if (exp <= now) return json({ error: "TOKEN_EXPIRED" }, 401);

  const claims = {
    sub,
    role: "authenticated",
    aud: "authenticated",
    iss: `${ISSUER}#trex-token-exchange`,
    exp,
    iat: now,
    email: typeof payload.email === "string" ? payload.email : "",
    app_metadata: { provider: "logto", providers: ["logto"], trex_role: isAdmin ? "admin" : "user" },
    user_metadata: {},
    session_id: crypto.randomUUID(),
  };

  const data = `${b64url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })))}.${b64url(encoder.encode(JSON.stringify(claims)))}`;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(data));
  const accessToken = `${data}.${b64url(new Uint8Array(sig))}`;

  return json({ access_token: accessToken, token_type: "bearer", expires_at: exp });
});
