// Obtain a portal bearer token for the setup scripts, from whichever IdP the
// stack is configured to use.
//
// The two flows are genuinely different shapes, not variations on one:
//   logto — a browser interaction dance (/oidc/auth, /sign-in, /consent) driven
//           with _interaction cookies, then a code exchange.
//   trex  — password grant against the native IdP to establish a session, then
//           the standard authorization-code flow against the OIDC provider.
//
// The trex path must go through the code flow. Its native IdP issues HS256
// tokens while the OIDC provider issues RS256 ones from the JWKS key, and WebAPI
// validates against the JWKS — so the password-grant token alone is rejected
// downstream even though it looks like a working login here.
import { Agent } from "undici";

const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

/** Which IdP the stack authenticates against. Mirrors trex's d2e-compat. */
export function selectedIdp(env = process.env) {
  const raw = (env.D2E_IDP ?? "").trim().toLowerCase();
  if (raw === "" || raw === "logto") return "logto";
  if (raw === "trex") return "trex";
  throw new Error(`Unknown D2E_IDP "${raw}" (expected "logto" or "trex")`);
}

/**
 * Ensure the setup user exists in trex, creating it if not.
 *
 * CI has no seeded trex account, and self-registration is off by design, so the
 * script provisions its own via the admin endpoint. The service-role key is read
 * from the database rather than the environment because nothing publishes it
 * there — it is minted by trex on first boot.
 */
export async function ensureTrexUser({ gateway, email, password, serviceRoleKey }) {
  const res = await fetch(`${gateway}/trex/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ email, password, data: { provisionedFor: "d2e-setup" } }),
    dispatcher: insecureAgent,
  });
  // 422 user_already_exists is the steady state on a re-run, not a failure.
  if (!res.ok && res.status !== 422) {
    throw new Error(`Could not provision ${email} in trex: ${res.status} ${await res.text()}`);
  }
}

/**
 * Grant application roles to a trex user.
 *
 * The setup flow calls admin-only d2e APIs, so the account it authenticates as
 * needs the roles that authorize them. Roles are named exactly as
 * webapi.sec_role and d2e's role map expect; see canonicalRoleNames.
 */
export async function grantTrexRoles({ gateway, userId, roles, serviceRoleKey }) {
  for (const role of roles) {
    const res = await fetch(`${gateway}/trex/admin/roles/assign`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ userId, role }),
      dispatcher: insecureAgent,
    });
    if (!res.ok) {
      throw new Error(`Could not grant "${role}" to ${userId}: ${res.status} ${await res.text()}`);
    }
  }
}

/**
 * Ensure the setup account has a usermgmt row.
 *
 * Roles alone are not enough: without a row, usermgmt cannot resolve the user
 * and falls back to looking it up in Logto, which 404s on a trex subject id and
 * surfaces as a 500. The row is created through usermgmt's own API rather than
 * by writing its schema directly -- a test harness should not reach into
 * another service's tables.
 *
 * `idp_user_id` is deliberately not set here: usermgmt matches by username on
 * first login and stamps the subject itself, so passing it would duplicate a
 * linkage the service already owns.
 */
export async function ensureUsermgmtUser({ gateway, token, username }) {
  const { randomUUID } = await import("node:crypto");
  const res = await fetch(`${gateway}/usermgmt/api/user`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id: randomUUID(), username }),
    dispatcher: insecureAgent,
  });
  if (!res.ok) {
    throw new Error(
      `Could not create the usermgmt row for ${username}: ${res.status} ${await res.text()}`,
    );
  }
}

/**
 * The trex user id for an account, taken from its own login token.
 *
 * There is no admin *list* endpoint (only create), so the id is read from the
 * `sub` of a native login rather than looked up. That also proves the
 * credentials work before anything is granted to the account.
 */
export async function trexUserId({ gateway, email, password }) {
  const res = await fetch(`${gateway}/trex/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    dispatcher: insecureAgent,
  });
  if (!res.ok) {
    throw new Error(`trex login failed for ${email}: ${res.status} ${await res.text()}`);
  }
  const { access_token: token } = await res.json();
  const sub = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString(),
  ).sub;
  if (!sub) throw new Error(`trex token for ${email} carried no sub`);
  return sub;
}

/**
 * Log in against trex and return a bearer the d2e APIs accept.
 *
 * `code_verifier` is fixed rather than random: this is a setup script against a
 * local stack, and a stable value keeps the challenge reproducible when the flow
 * has to be debugged by hand.
 */
export async function trexBearerToken({ gateway, email, password, clientId, clientSecret }) {
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const challenge = await pkceChallenge(verifier);
  const redirectUri = `${gateway}/d2e/portal/login-callback`;

  // 1. Native login — establishes the session the OIDC provider reads.
  const login = await fetch(`${gateway}/trex/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    dispatcher: insecureAgent,
  });
  if (!login.ok) {
    throw new Error(`trex login failed for ${email}: ${login.status} ${await login.text()}`);
  }
  const cookies = (login.headers.getSetCookie() || [])
    .map((c) => c.split(";")[0])
    .join("; ");

  // 2. Authorization code.
  const authorize = new URL(`${gateway}/trex/oidc/authorize`);
  authorize.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: "d2e-setup",
  }).toString();
  const authRes = await fetch(authorize, {
    method: "GET",
    headers: { Cookie: cookies },
    redirect: "manual",
    dispatcher: insecureAgent,
  });
  const location = authRes.headers.get("location") ?? "";
  const code = new URL(location, gateway).searchParams.get("code");
  if (!code) {
    throw new Error(
      `trex authorize returned no code (HTTP ${authRes.status}). Location: ${location}`,
    );
  }

  // 3. Redeem through the d2e proxy, the same endpoint the portal uses.
  const tokenRes = await fetch(`${gateway}/d2e/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
      code_verifier: verifier,
    }),
    dispatcher: insecureAgent,
  });
  if (!tokenRes.ok) {
    throw new Error(`trex token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }
  const body = await tokenRes.json();
  const token = body.id_token || body.access_token;
  if (!token) {
    throw new Error("trex token response carried neither id_token nor access_token");
  }
  return token;
}

async function pkceChallenge(verifier) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * The one call the setup scripts make: a bearer for an account that is ready to
 * drive them, whichever IdP the stack uses.
 *
 * Only the trex branch lives here. The Logto flow stays inline in each script:
 * it is a long interaction dance those scripts already own, and moving it would
 * be a refactor with no behaviour change to justify the risk.
 *
 * Provisioning runs before every login rather than once. Each step is idempotent
 * and cheap, and CI starts from an empty trex on every run, so "create if
 * missing" is the normal path, not an exception.
 */
export async function trexSetupBearer({
  gateway,
  email,
  password,
  clientId,
  clientSecret,
  serviceRoleKey,
  roles = ["role.systemadmin", "admin", "role.useradmin"],
}) {
  await ensureTrexUser({ gateway, email, password, serviceRoleKey });
  const userId = await trexUserId({ gateway, email, password });
  await grantTrexRoles({ gateway, userId, roles, serviceRoleKey });

  const token = await trexBearerToken({ gateway, email, password, clientId, clientSecret });
  // Needs a token, so it comes after login: usermgmt authorizes this call from
  // the roles granted above, which the token carries.
  await ensureUsermgmtUser({ gateway, token, username: email });
  return token;
}
