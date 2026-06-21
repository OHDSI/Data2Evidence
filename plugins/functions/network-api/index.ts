// @ts-nocheck - Deno edge function, runs in trex's EdgeRuntime (not tsc-compiled)
//
// Site machine-auth proxy. Holds the per-site Cognito *confidential* client
// (client_id + client_secret) in server-side env and reverse-proxies the
// browser network plugin's calls to the Central Serverless API, attaching a
// machine (client-credentials) bearer token. The secret AND the machine token
// stay inside this worker — the browser only ever sees the proxied response.
//
// Mounted by trex at  <PLUGINS_BASE_PATH>/<scope>/network-api/*  (see the
// `trex.functions.api` entry in package.json). Everything after `/network-api`
// is forwarded verbatim to NETWORK_CENTRAL_API_URL.
//
// Env (injected via trex.functions.env from the trex service):
//   NETWORK_MACHINE_CLIENT_ID  per-site Cognito *confidential* client id     (required)
//   NETWORK_CLIENT_SECRET      per-site Cognito *confidential* client secret (required)
//   NETWORK_COGNITO_DOMAIN     e.g. https://<pool>.auth.<region>.amazoncognito.com (required)
//   NETWORK_CENTRAL_API_URL    central API base, e.g. https://abc.execute-api...  (required)
//   NETWORK_TOKEN_SCOPE        optional client-credentials scope
//
// NOTE: the machine client id is DISTINCT from the browser's human-login
// client (NETWORK_CLIENT_ID = the shared public SitePluginClient). This worker
// uses the per-site confidential client that carries a secret.

import { readRow, savePending, saveActive, readMachineCreds } from "./store.ts";

const PREFIX = "/network-api";

function env(name: string): string {
  return (Deno.env.get(name) ?? "").trim();
}

function json(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// --- machine token cache (module scope, per worker) ---------------------------
let cachedToken: string | null = null;
let cachedExpiryMs = 0;

async function getMachineToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < cachedExpiryMs) return cachedToken;

  const domain = env("NETWORK_COGNITO_DOMAIN").replace(/\/+$/, "");
  const stored = await readMachineCreds().catch(() => null);
  const clientId = stored?.clientId || env("NETWORK_MACHINE_CLIENT_ID");
  const clientSecret = stored?.clientSecret || env("NETWORK_CLIENT_SECRET");
  const scope = env("NETWORK_TOKEN_SCOPE");

  const body = new URLSearchParams({ grant_type: "client_credentials" });
  if (scope) body.set("scope", scope);

  // Confidential client → HTTP Basic auth (Cognito convention). btoa is fine
  // for ASCII client ids/secrets.
  const basic = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${domain}/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${basic}`,
    },
    body,
  });

  if (!res.ok) {
    // Do NOT include the upstream body — it can echo client config. Status only.
    throw new Error(`cognito token endpoint returned ${res.status}`);
  }

  const data = await res.json();
  const token = data.access_token as string | undefined;
  const expiresIn = Number(data.expires_in ?? 0);
  if (!token) throw new Error("cognito response missing access_token");

  cachedToken = token;
  // Refresh ~60s before expiry; floor at 30s so a tiny/absent expires_in still caches briefly.
  cachedExpiryMs = now + Math.max(30, expiresIn - 60) * 1000;
  return token;
}

Deno.serve(async (req: Request) => {
  // 1. Compute the central sub-path: everything after `/network-api`.
  const url = new URL(req.url);
  const idx = url.pathname.indexOf(PREFIX);
  if (idx === -1) {
    return json(404, "NOT_FOUND", "request did not match the network-api mount");
  }
  const subPath = url.pathname.slice(idx + PREFIX.length) || "/";
  const sp = subPath.replace(/\/+$/, "") || "/";

  // 2. Auth gate — trex injects x-user-id for authenticated callers. Only
  //    logged-in site operators may drive the machine proxy.
  if (!req.headers.get("x-user-id")) {
    return json(401, "UNAUTHENTICATED", "authentication required");
  }

  // 3. Self-signup relay (no machine creds required for a fresh node) ---------
  if (sp === "/signup" && req.method === "POST") {
    const base = env("NETWORK_CENTRAL_API_URL").replace(/\/+$/, "");
    if (!base) return json(503, "NOT_CONFIGURED", "NETWORK_CENTRAL_API_URL unset");
    let up: Response;
    try {
      up = await fetch(`${base}/signup`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: await req.arrayBuffer(),
      });
    } catch (_e) {
      return json(502, "UPSTREAM_UNREACHABLE", "central signup failed");
    }
    if (!up.ok) return new Response(up.body, { status: up.status, headers: { "content-type": "application/json" } });
    const data = await up.json(); // { siteId, claimToken }
    try {
      await savePending(String(data.siteId), String(data.claimToken));
    } catch (_e) {
      return json(500, "STORE_WRITE_FAILED", "could not persist signup state");
    }
    return new Response(JSON.stringify({ siteId: data.siteId, status: "pending" }),
      { status: 200, headers: { "content-type": "application/json" } });
  }
  if (sp === "/signup/state" && req.method === "GET") {
    const row = await readRow().catch(() => null);
    return new Response(JSON.stringify({ registered: row?.status === "active", status: row?.status ?? "none" }),
      { status: 200, headers: { "content-type": "application/json" } });
  }
  if (sp === "/signup/status" && req.method === "GET") {
    const row = await readRow().catch(() => null);
    if (!row?.siteId) return new Response(JSON.stringify({ status: "none" }), { status: 200, headers: { "content-type": "application/json" } });
    if (row.status === "active") return new Response(JSON.stringify({ status: "active" }), { status: 200, headers: { "content-type": "application/json" } });
    if (!env("NETWORK_ENC_KEY")) return json(503, "NOT_CONFIGURED", "NETWORK_ENC_KEY unset");
    const base = env("NETWORK_CENTRAL_API_URL").replace(/\/+$/, "");
    if (!base) return json(503, "NOT_CONFIGURED", "NETWORK_CENTRAL_API_URL unset");
    let up: Response;
    try {
      up = await fetch(`${base}/signup/${encodeURIComponent(row.siteId)}`, { headers: { "x-signup-token": row.claimToken ?? "" } });
    } catch (_e) {
      return json(502, "UPSTREAM_UNREACHABLE", "central status failed");
    }
    if (!up.ok) return new Response(up.body, { status: up.status, headers: { "content-type": "application/json" } });
    const data = await up.json();
    if (data.status === "active" && data.clientSecret) {
      await saveActive(String(data.cognitoClientId), String(data.clientSecret));
      return new Response(JSON.stringify({ status: "active" }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ status: data.status ?? "pending" }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // 4. Machine-config gate for non-signup paths
  for (const v of ["NETWORK_COGNITO_DOMAIN", "NETWORK_CENTRAL_API_URL", "NETWORK_ENC_KEY"]) {
    if (!env(v)) return json(503, "NOT_CONFIGURED", `network-api is not configured (${v} unset)`);
  }
  const haveStored = (await readMachineCreds().catch(() => null)) !== null;
  if (!haveStored && (!env("NETWORK_MACHINE_CLIENT_ID") || !env("NETWORK_CLIENT_SECRET"))) {
    return json(503, "NOT_REGISTERED", "site has no machine credentials yet — sign up first");
  }

  // 5. Build target URL
  const base = env("NETWORK_CENTRAL_API_URL").replace(/\/+$/, "");
  const target = `${base}${subPath}${url.search}`;

  // 6. Machine token
  let machineToken: string;
  try {
    machineToken = await getMachineToken();
  } catch (_e) {
    return json(502, "TOKEN_EXCHANGE_FAILED", "could not obtain machine token");
  }

  // 7. Proxy to central. Forward only a safe header subset; the machine token
  //    replaces any caller Authorization.
  const fwdHeaders: Record<string, string> = { authorization: `Bearer ${machineToken}` };
  const ct = req.headers.get("content-type");
  if (ct) fwdHeaders["content-type"] = ct;
  const accept = req.headers.get("accept");
  if (accept) fwdHeaders["accept"] = accept;

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers: fwdHeaders,
      body: hasBody ? await req.arrayBuffer() : undefined,
    });
  } catch (_e) {
    return json(502, "UPSTREAM_UNREACHABLE", "central API request failed");
  }

  // Pass status + body + content-type straight through so the UI sees real
  // central errors. Strip hop-by-hop / encoding headers.
  const respHeaders: Record<string, string> = {};
  const uct = upstream.headers.get("content-type");
  if (uct) respHeaders["content-type"] = uct;
  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
});
