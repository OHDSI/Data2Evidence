import http from "k6/http";
import { check, fail } from "k6";

// PKCE values are fixed (same as _test-http-duckdb.yml).
// The code_challenge is the S256 hash of code_verifier.
const CODE_VERIFIER = "kqVLhCyXRJ3Y9mXie6F9d1FW8AUbTUzIuJiqUf1SM9I";
const CODE_CHALLENGE = "n6eqz8p8jj1L9Qu7pY2_GrWO7XyaQbWrcs54x9OAnPg";
const STATE = "lbFDB1hcko";
const NONCE = "Osptnuwqc47w";

function parseCookies(response) {
  const cookies = {};
  const headers = response.headers;
  // k6 exposes Set-Cookie headers as an array under "Set-Cookie"
  const raw = headers["Set-Cookie"] || "";
  const lines = Array.isArray(raw) ? raw : [raw];
  lines.forEach((line) => {
    const part = line.split(";")[0];
    const eq = part.indexOf("=");
    if (eq > 0) {
      const name = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      cookies[name] = value;
    }
  });
  return cookies;
}

function cookieHeader(cookies) {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function cookieHeaderWithAppId(cookies, clientId) {
  const base = cookieHeader(cookies);
  return base + `; _logto={"appId":"${clientId}"}`;
}

function extractCode(response) {
  const loc = response.headers["Location"] || "";
  const m = loc.match(/[?&]code=([^&]+)/);
  return m ? m[1] : null;
}

function decodeJwtClaims(token) {
  const payload = token.split(".")[1];
  // Base64url → base64 → decode
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "==".slice((b64.length + 3) % 4);
  return JSON.parse(atob(padded));
}

/**
 * Performs the full Logto OIDC auth flow and returns { bearerToken, userId }.
 * Must be called from a k6 setup() function (single VU, once before the test).
 *
 * Required env vars (passed via -e flag or K6_ prefix):
 *   BASE_URL              - e.g. https://d2e-caddy.alp.local:41130
 *   LOGTO_CLIENT_ID       - value of LOGTO__D2E_APP__CLIENT_ID
 *   ADMIN_USERNAME        - defaults to "admin"
 *   ADMIN_PASSWORD        - defaults to "Updatepassword12345"
 */
export function logtoAuth() {
  const baseUrl = __ENV.BASE_URL || __ENV.K6_BASE_URL;
  const clientId = __ENV.LOGTO_CLIENT_ID;
  const username = __ENV.ADMIN_USERNAME || "admin";
  const password = __ENV.ADMIN_PASSWORD || "Updatepassword12345";

  if (!baseUrl) fail("BASE_URL or K6_BASE_URL env var is required");
  if (!clientId) fail("LOGTO_CLIENT_ID env var is required");

  const params = { redirects: 0 };

  // ── Step 1: Initiate OIDC auth, collect interaction cookies ──────────────
  const authUrl =
    `${baseUrl}/oidc/auth` +
    `?redirect_uri=${encodeURIComponent(`${baseUrl}/d2e/portal/login-callback`)}` +
    `&client_id=${clientId}` +
    `&response_type=code` +
    `&state=${STATE}` +
    `&scope=openid%20offline_access%20profile%20email` +
    `&nonce=${NONCE}` +
    `&code_challenge=${CODE_CHALLENGE}` +
    `&code_challenge_method=S256`;

  let res = http.get(authUrl, params);
  check(res, { "step1 status ok": (r) => r.status < 400 });

  let cookies = parseCookies(res);

  // ── Step 2: PUT /api/interaction — sign-in with credentials ──────────────
  res = http.put(
    `${baseUrl}/api/interaction`,
    JSON.stringify({
      event: "SignIn",
      identifier: { username, password },
    }),
    {
      ...params,
      headers: {
        "content-type": "application/json",
        Referer: `${baseUrl}/sign-in`,
        Cookie: cookieHeaderWithAppId(cookies, clientId),
      },
    }
  );
  check(res, { "step2 status ok": (r) => r.status < 400 });
  Object.assign(cookies, parseCookies(res));

  // ── Step 3: POST /api/interaction/submit ─────────────────────────────────
  res = http.post(`${baseUrl}/api/interaction/submit`, null, {
    ...params,
    headers: {
      accept: "application/json",
      origin: baseUrl,
      Referer: `${baseUrl}/sign-in`,
      Cookie: cookieHeaderWithAppId(cookies, clientId),
    },
  });
  check(res, { "step3 status ok": (r) => r.status < 400 });
  Object.assign(cookies, parseCookies(res));

  // ── Step 4: GET /oidc/auth/{interaction} — follow authorization redirect ──
  const interactionId = cookies["_interaction"];
  res = http.get(`${baseUrl}/oidc/auth/${interactionId}`, {
    ...params,
    headers: {
      Referer: `${baseUrl}/sign-in`,
      Cookie: cookieHeaderWithAppId(cookies, clientId),
    },
  });
  check(res, { "step4 status ok": (r) => r.status < 400 });
  Object.assign(cookies, parseCookies(res));

  // ── Step 5: GET /consent ──────────────────────────────────────────────────
  res = http.get(`${baseUrl}/consent`, {
    ...params,
    headers: {
      accept: "text/html,application/xhtml+xml,*/*",
      Referer: `${baseUrl}/sign-in`,
      Cookie: cookieHeaderWithAppId(cookies, clientId),
    },
  });
  check(res, { "step5 status ok": (r) => r.status < 400 });
  Object.assign(cookies, parseCookies(res));

  // ── Step 6: GET /oidc/auth/{interaction} again — get authorization code ──
  res = http.get(`${baseUrl}/oidc/auth/${interactionId}`, {
    ...params,
    headers: {
      accept: "text/html,application/xhtml+xml,*/*",
      Referer: `${baseUrl}/sign-in`,
      Cookie: cookieHeaderWithAppId(cookies, clientId),
    },
  });
  check(res, { "step6 status ok": (r) => r.status < 400 });
  Object.assign(cookies, parseCookies(res));

  const authCode = extractCode(res);
  if (!authCode) fail("Failed to extract authorization code from redirect");

  // ── Step 7: GET /d2e/portal/login-callback ───────────────────────────────
  res = http.get(
    `${baseUrl}/d2e/portal/login-callback` +
      `?code=${authCode}&state=${STATE}&iss=${encodeURIComponent(`${baseUrl}/oidc`)}`,
    {
      ...params,
      headers: {
        accept: "text/html,application/xhtml+xml,*/*",
        Referer: `${baseUrl}/sign-in`,
        Cookie: cookieHeaderWithAppId(cookies, clientId),
      },
    }
  );
  check(res, { "step7 status ok": (r) => r.status < 400 });
  Object.assign(cookies, parseCookies(res));

  // ── Step 8: POST /d2e/oauth/token — exchange code for access token ────────
  res = http.post(
    `${baseUrl}/d2e/oauth/token`,
    `grant_type=authorization_code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(`${baseUrl}/d2e/portal/login-callback`)}` +
      `&code=${encodeURIComponent(authCode)}` +
      `&code_verifier=${CODE_VERIFIER}`,
    {
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "content-type": "application/x-www-form-urlencoded",
        origin: baseUrl,
        Cookie: cookieHeaderWithAppId(cookies, clientId),
      },
    }
  );
  check(res, { "step8 token ok": (r) => r.status === 200 });

  const tokenBody = res.json();
  const bearerToken = tokenBody["access_token"];
  if (!bearerToken) fail("No access_token in token response");

  // ── Step 9: Decode JWT to get sub ─────────────────────────────────────────
  const claims = decodeJwtClaims(bearerToken);
  const idpSub = claims["sub"];

  // ── Step 10: Resolve internal userId from usermgmt ───────────────────────
  res = http.post(
    `${baseUrl}/d2e/usermgmt/api/user-group/list`,
    JSON.stringify({ userId: idpSub }),
    {
      headers: {
        accept: "application/json, text/plain, */*",
        authorization: `Bearer ${bearerToken}`,
        "content-type": "application/json",
        origin: baseUrl,
      },
    }
  );
  check(res, { "step10 usermgmt ok": (r) => r.status === 200 });

  const mgmtBody = res.json();
  const userId =
    Array.isArray(mgmtBody) && mgmtBody.length > 0
      ? mgmtBody[0]["userId"]
      : idpSub;

  return { bearerToken, userId };
}
