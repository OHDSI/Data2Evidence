// `@axa-fr/react-oidc` appends its own logout parameters — `id_token_hint` and
// `post_logout_redirect_uri` — to `end_session_endpoint` with a hard-coded `?`.
// An endpoint that already carries a query string therefore grows a SECOND `?`,
// and everything the library adds lands inside the value of the last existing
// parameter rather than beside it. Measured on a CI stack:
//
//   /trex/oidc/oauth2/end-session?client_id=d2e-webapi
//     &redirect=https://localhost/d2e/portal?id_token_hint=eyJ...
//
// That parses as two parameters, neither of them the hint, so the provider sees
// a hintless logout and answers with its confirm-logout page. The browser stops
// there: the user is signed out only if they press a button, and is never
// returned to the portal.
//
// The value is served by trex (`d2e-compat` builds /portal/env.js) and its
// provider needs neither parameter — the library sends the hint and the
// post-logout URI itself, and the registered client's postLogoutRedirectUris is
// what authorizes the return. This is also fixed there; the guard stays because
// a portal build and the trex image it talks to are versioned separately, and
// one old image puts the logout back.

/** The path trex's provider serves RP-initiated logout on. */
const TREX_END_SESSION_PATH = "/oauth2/end-session";

/**
 * Removes the query string from trex's `end_session_endpoint`, leaving every
 * other provider's untouched.
 *
 * Logto's endpoint keeps the query it has always been handed: its confirm page
 * auto-submits, which is why this stayed invisible until the IdP moved, and
 * changing that path would risk a logout that works today.
 */
export function normalizeEndSessionEndpoint(config: any): any {
  const authorityConfig = config?.authority_configuration;
  const endpoint = authorityConfig?.end_session_endpoint;
  if (typeof endpoint !== "string") return config;

  const queryStart = endpoint.indexOf("?");
  if (queryStart === -1) return config;

  const base = endpoint.slice(0, queryStart);
  if (!base.endsWith(TREX_END_SESSION_PATH)) return config;

  return {
    ...config,
    authority_configuration: { ...authorityConfig, end_session_endpoint: base },
  };
}
