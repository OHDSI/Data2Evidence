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
//   NETWORK_COORDINATOR_CLIENT_ID      COORDINATOR-scoped confidential client id (optional, see below)
//   NETWORK_COORDINATOR_CLIENT_SECRET  COORDINATOR-scoped confidential client secret (optional)
//   NETWORK_COORDINATOR_TOKEN_SCOPE    optional client-credentials scope for the coordinator token
//
// NOTE: the machine client id is DISTINCT from the browser's human-login
// client (NETWORK_CLIENT_ID = the shared public SitePluginClient). This worker
// uses the per-site confidential client that carries a secret.
//
// --- Coordinator-scoped actions (POST /studies, POST /studies/{id}/publish) ---
// Central's requireCoordinator() gate (central/api/src/handlers/studies.ts)
// requires role === 'coordinator', and central's resolveRole()
// (central/api/src/lib/auth.ts) only ever assigns that role to a token that
// carries BOTH `cognito:groups: [...'coordinator'...]` AND a `sub` claim —
// i.e. a human's Cognito Hosted-UI (PKCE) login placed in the CoordinatorGroup.
// A client_credentials (M2M) token never carries `cognito:groups` (that claim
// is Cognito user/group membership, not app-client membership), so it always
// falls through to role === 'machine' and central 403s it on these two routes.
//
// Central today provisions exactly two Cognito app clients — both PKCE/
// authorization-code only (CoordinationCenterClient, SitePluginClient) — and
// its only client_credentials clients are per-site machine clients scoped to
// the `network-api/site` resource-server scope (see central/template.yaml).
// There is no coordinator resource-server scope and no Pre-Token-Generation
// trigger (central/api/src/preTokenGen.ts) that stamps cognito:groups onto an
// M2M token. So the coordinator token-mint code below is a scaffold for a
// central-side change that does not exist yet, not a working path today.
//
// COORDINATOR_CENTRAL_SUPPORTED must stay `false` — and GET /coordinator/state
// must keep reporting configured:false — until ONE of the following ships:
//   (i)  central provisions a coordinator-scoped confidential/M2M app client
//        whose Pre-Token-Generation trigger stamps cognito:groups=['coordinator']
//        (plus a synthetic sub) onto that client's client_credentials tokens, or
//   (ii) the editor gains a human coordinator PKCE login (Phase 4 option b)
//        instead of proxying coordinator actions through this machine-token
//        worker.
// Flip the flag only after confirming (i) or (ii) is live in central.

import { readRow, savePending, saveActive, readMachineCreds } from "./store.ts";

const COORDINATOR_CENTRAL_SUPPORTED = false;

const PREFIX = "/network-api";

// Mirror hades-api's mount handling: strip up to and including the LAST
// "/network-api" segment, so both a doubled "/plugins/network-api/network-api/studies"
// and a bare "/network-api/studies" yield "/studies".
export function stripPrefix(pathname: string): string {
  const idx = pathname.lastIndexOf(PREFIX);
  if (idx === -1) return pathname;
  return pathname.slice(idx + PREFIX.length) || "/";
}

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

// --- coordinator token cache (module scope, per worker) -----------------------
// See the file-header comment for why this token is never actually accepted
// as coordinator by central today — this is a scaffold, gated separately by
// COORDINATOR_CENTRAL_SUPPORTED for the UI-facing probe.
let cachedCoordinatorToken: string | null = null;
let cachedCoordinatorExpiryMs = 0;

function haveCoordinatorCreds(): boolean {
  return Boolean(env("NETWORK_COORDINATOR_CLIENT_ID") && env("NETWORK_COORDINATOR_CLIENT_SECRET"));
}

async function getCoordinatorToken(): Promise<string> {
  const now = Date.now();
  if (cachedCoordinatorToken && now < cachedCoordinatorExpiryMs) return cachedCoordinatorToken;

  const domain = env("NETWORK_COGNITO_DOMAIN").replace(/\/+$/, "");
  const clientId = env("NETWORK_COORDINATOR_CLIENT_ID");
  const clientSecret = env("NETWORK_COORDINATOR_CLIENT_SECRET");
  const scope = env("NETWORK_COORDINATOR_TOKEN_SCOPE");

  const body = new URLSearchParams({ grant_type: "client_credentials" });
  if (scope) body.set("scope", scope);

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
    throw new Error(`cognito token endpoint returned ${res.status}`);
  }

  const data = await res.json();
  const token = data.access_token as string | undefined;
  const expiresIn = Number(data.expires_in ?? 0);
  if (!token) throw new Error("cognito response missing access_token");

  cachedCoordinatorToken = token;
  cachedCoordinatorExpiryMs = now + Math.max(30, expiresIn - 60) * 1000;
  return token;
}

// Coordinator-scoped routes per central's requireCoordinator() gate
// (central/api/src/handlers/studies.ts): creating a study and publishing it.
// The presigned-URL PUTs happen client-side against S3 directly and never
// hit this proxy.
export function isCoordinatorAction(method: string, path: string): boolean {
  if (method === "POST" && path === "/studies") return true;
  if (method === "POST" && /^\/studies\/[^/]+\/publish$/.test(path)) return true;
  return false;
}

// Single source of truth for whether a coordinator action may proceed. MUST
// mirror the GET /coordinator/state predicate exactly, so an operator who
// sets coordinator creds before central supports them (COORDINATOR_CENTRAL_SUPPORTED
// still false) gets a clean 503 here rather than a confusing 403 from central,
// AND the state endpoint and the route gate never disagree.
export function coordinatorActionAllowed(supported: boolean, haveCreds: boolean): boolean {
  return supported && haveCreds;
}

Deno.serve(async (req: Request) => {
  // 1. Compute the central sub-path: everything after the last `/network-api`.
  const url = new URL(req.url);
  if (url.pathname.lastIndexOf(PREFIX) === -1) {
    return json(404, "NOT_FOUND", "request did not match the network-api mount");
  }
  const subPath = stripPrefix(url.pathname);
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
  if (sp === "/coordinator/state" && req.method === "GET") {
    // Always false today — see the file-header comment. COORDINATOR_CENTRAL_SUPPORTED
    // is the single switch that would make this reflect haveCoordinatorCreds()
    // once central actually accepts a coordinator machine token.
    return new Response(
      JSON.stringify({ configured: coordinatorActionAllowed(COORDINATOR_CENTRAL_SUPPORTED, haveCoordinatorCreds()) }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  // 4. Config gate for non-signup paths
  for (const v of ["NETWORK_COGNITO_DOMAIN", "NETWORK_CENTRAL_API_URL", "NETWORK_ENC_KEY"]) {
    if (!env(v)) return json(503, "NOT_CONFIGURED", `network-api is not configured (${v} unset)`);
  }
  const coordinatorAction = isCoordinatorAction(req.method, sp);
  if (coordinatorAction) {
    // Coordinator actions NEVER fall back to the site machine token — that
    // would just trade a clear 503 for a confusing 403 from central. Gate on
    // BOTH COORDINATOR_CENTRAL_SUPPORTED and the creds, matching
    // GET /coordinator/state, so setting creds early (before central supports
    // them) still 503s here instead of minting a token and forwarding a 403.
    if (!coordinatorActionAllowed(COORDINATOR_CENTRAL_SUPPORTED, haveCoordinatorCreds())) {
      return json(503, "COORDINATOR_NOT_CONFIGURED", "coordinator credentials are not configured for this site");
    }
  } else {
    const haveStored = (await readMachineCreds().catch(() => null)) !== null;
    if (!haveStored && (!env("NETWORK_MACHINE_CLIENT_ID") || !env("NETWORK_CLIENT_SECRET"))) {
      return json(503, "NOT_REGISTERED", "site has no machine credentials yet — sign up first");
    }
  }

  // 5. Build target URL
  const base = env("NETWORK_CENTRAL_API_URL").replace(/\/+$/, "");
  const target = `${base}${subPath}${url.search}`;

  // 6. Token — coordinator actions use the coordinator credential pair,
  //    everything else uses the per-site machine token. Never mix the two.
  let bearerToken: string;
  try {
    bearerToken = coordinatorAction ? await getCoordinatorToken() : await getMachineToken();
  } catch (_e) {
    return json(502, "TOKEN_EXCHANGE_FAILED", coordinatorAction ? "could not obtain coordinator token" : "could not obtain machine token");
  }

  // 7. Proxy to central. Forward only a safe header subset; the bearer token
  //    replaces any caller Authorization.
  const fwdHeaders: Record<string, string> = { authorization: `Bearer ${bearerToken}` };
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
