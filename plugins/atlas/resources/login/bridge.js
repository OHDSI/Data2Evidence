/*
 * Standalone /atlas Logto login bridge. Performs a Logto OIDC login (reusing the
 * portal's OIDC config from /d2e/portal/env.js) and writes the Logto access token
 * to localStorage.bearerToken for Atlas3; trex exchanges it per /WebAPI call.
 * Plain ES, served as static files at /atlas-login/.
 */
(function () {
  "use strict";

  // Atlas3 reads its bearer token from this localStorage key (initializeFromStorage).
  var TOKEN_KEY = "bearerToken";
  // Logto API resource → makes Logto issue a verifiable JWT access token (not opaque).
  // Only Logto's. trex's provider registers exactly ONE RFC 8707 resource — its
  // own issuer — and answers `requested resource ... is not configured` for any
  // other, so this constant cannot be sent to it. resourceFor() picks per IdP.
  var LOGTO_RESOURCE = "https://alp-default";
  var REDIRECT_URI = location.origin + "/atlas-login/";
  // Data Sources is d2e's Atlas landing route (plugins.standalone.json sets
  // theme.logoNavigateTo to it, which is what Atlas3 redirects "/" to).
  var DEFAULT_RETURN = "/atlas/#/plugins/datasources/";
  var VERIFIER_KEY = "atlas_pkce_verifier";
  var RETURN_KEY = "atlas_login_return_to";
  var STATE_KEY = "atlas_oidc_state";
  // Stops a restarted sign-in from bouncing between here and /authorize.
  var RESTART_TS_KEY = "atlas_login_restart_ts";
  var RESTART_GUARD_MS = 10000;
  // Same origin as Atlas, behind the same gateway the portal reaches usermgmt
  // through. The name it answers with is the one vue-mri matches saved work by.
  var USERMGMT_ME_URL = "/d2e/usermgmt/api/me";
  // Long enough for a same-origin call that normally answers in milliseconds,
  // short enough that a stalled one is never what the user waits behind.
  var USERMGMT_ME_TIMEOUT_MS = 3000;

  function fail(msg) {
    var s = document.getElementById("spinner");
    if (s) s.style.display = "none";
    var el = document.getElementById("status");
    if (el) { el.className = "err"; el.textContent = "Sign-in failed: " + msg; }
    console.error("[atlas-login]", msg);
  }

  /**
   * The RFC 8707 resource to ask for, which differs per IdP.
   *
   * trex's provider is mounted on this same origin (its issuer is
   * `<origin>/trex/oidc`), while an external IdP's issuer names another host —
   * Logto's is its internal URL. Same-origin therefore means "trex is the
   * provider", and its registered resource is precisely that issuer.
   *
   * The resource is still sent rather than omitted: a token request naming none
   * gets no audience claim at all, and the access token comes back opaque rather
   * than a JWT, which Atlas cannot read.
   */
  function resourceFor(ac) {
    var issuer = String((ac && ac.issuer) || "");
    if (!issuer) return LOGTO_RESOURCE;
    var origin;
    try { origin = new URL(issuer).origin; } catch (e) { return LOGTO_RESOURCE; }
    // Compared as PARSED origins, never as strings. The issuer is built from
    // TREX_OIDC_ISSUER and carries an explicit `:443`, while location.origin
    // drops the default port -- so a string prefix test matches nothing on
    // exactly the deployments this is for.
    if (origin !== location.origin) return LOGTO_RESOURCE;
    // Returned verbatim (port and all, only a trailing slash trimmed): the
    // provider compares this against the identifier it registered, which is
    // this string, not its normalised form.
    return issuer.replace(/\/+$/, "");
  }

  function getConfig() {
    var env = window.ENV_DATA || {};
    var raw = env.REACT_APP_IDP_OIDC_CONFIG;
    if (!raw) throw new Error("OIDC config not available (env.js / ENV_DATA missing)");
    var cfg = JSON.parse(String(raw).split("{window.location.origin}").join(location.origin));
    var ac = cfg.authority_configuration || {};
    if (!cfg.client_id || !ac.authorization_endpoint || !ac.token_endpoint) {
      throw new Error("OIDC config incomplete");
    }
    var scope = cfg.scope || "openid profile email";
    if (!/(^|\s)offline_access(\s|$)/.test(scope)) scope += " offline_access"; // need a refresh token
    return {
      clientId: cfg.client_id,
      authorize: ac.authorization_endpoint,
      token: ac.token_endpoint,
      scope: scope.trim(),
      resource: resourceFor(ac)
    };
  }

  function b64url(bytes) {
    var s = "";
    var arr = new Uint8Array(bytes);
    for (var i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function randomString(n) {
    var a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return b64url(a.buffer);
  }
  function sha256(str) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  }

  function resolveReturnTarget(params) {
    // Atlas3 calls the provider with ?redirectUrl=<encoded current hash>, e.g. "#/cohorts".
    var rd = params.get("returnTo") || params.get("redirectUrl");
    if (!rd) return DEFAULT_RETURN;
    if (rd.charAt(0) === "#") return "/atlas/" + rd;
    // Only same-origin absolute paths; reject protocol-relative "//host" and
    // backslash variants to prevent open redirects.
    if (rd.charAt(0) === "/" && rd.charAt(1) !== "/" && rd.charAt(1) !== "\\") return rd;
    return DEFAULT_RETURN;
  }

  function safeReturn(ret) {
    if (!ret) return DEFAULT_RETURN;
    try {
      // Resolve against our own origin and keep only the same-origin path; this
      // drops protocol-relative ("//host"), absolute, and "javascript:" targets,
      // so only a same-origin path+hash can ever reach location.replace.
      var u = new URL(ret, location.origin);
      if (u.origin !== location.origin) return DEFAULT_RETURN;
      return u.pathname + u.search + u.hash;
    } catch (e) {
      return DEFAULT_RETURN;
    }
  }

  async function handleCallback(cfg, params) {
    var verifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!verifier) {
      // A callback whose verifier has already been spent. The exchange consumes
      // it, so ANY second visit to this URL arrives here: a reload, the Back
      // button, a restored tab, or an autocompleted address. Dead-ending on an
      // error was wrong -- nothing is broken, the request is simply finished,
      // and the useful response is a fresh authorization rather than a message
      // the user can do nothing with.
      //
      // Safe to restart: no token has been issued on this path, the spent code
      // buys nothing, and startLogin mints a new verifier and state. Guarded by
      // a timestamp so a restart that somehow lands straight back here stops
      // instead of looping.
      var lastRestart = parseInt(sessionStorage.getItem(RESTART_TS_KEY) || "0", 10);
      if (Date.now() - lastRestart < RESTART_GUARD_MS) {
        fail("sign-in did not complete. Please start again from Atlas.");
        return;
      }
      sessionStorage.setItem(RESTART_TS_KEY, String(Date.now()));
      await startLogin(cfg, params);
      return;
    }
    // Validate the OIDC state to prevent CSRF/login injection.
    var expectedState = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
    if (!expectedState || params.get("state") !== expectedState) {
      fail("state mismatch (possible CSRF)"); return;
    }
    var body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("code", params.get("code"));
    body.set("redirect_uri", REDIRECT_URI);
    body.set("client_id", cfg.clientId);
    body.set("code_verifier", verifier);
    body.set("resource", cfg.resource);

    var resp = await fetch(cfg.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    var data = await resp.json().catch(function () { return {}; });
    if (!resp.ok || !data.access_token) {
      fail((data && (data.error_description || data.error)) || ("token endpoint " + resp.status));
      return;
    }
    localStorage.setItem(TOKEN_KEY, data.access_token);
    // vue-mri matches the current user's own bookmarks and cohort definitions by
    // username, so this has to be the SAME STRING the services that store them
    // write: usermgmt's `username` column, which bookmark-svc reads from this
    // very endpoint to set a bookmark's user_id.
    //
    // It used to be read off the id_token instead:
    //
    //   idc.username || idc.preferred_username || idc.email || idc.name || idc.sub
    //
    // which agreed with usermgmt only while Logto was the provider, because
    // Logto emitted a `username` claim. trex's Better Auth provider emits none,
    // so that chain fell through to `email` — the synthesised
    // <username>@d2e.local an email-less account is registered under — and
    // every bookmark the user owned stopped matching. The list still arrived;
    // the client dropped it, and PA reported "No saved cohort definitions".
    //
    // An id_token is not the place to look for this even when a claim is
    // present: it describes the authenticated subject, while the saved work is
    // filed under a name a different system owns. Ask that system.
    // BOUNDED, because this sits between the token exchange and the redirect
    // below. An unbounded await here does not fail the sign-in, it SUSPENDS it:
    // location.replace(ret) is never reached, the callback page stays on screen
    // and the user sees a sign-in that never completes. A try/catch does not
    // help -- it catches a rejection, and the failure mode is a request that
    // simply never settles.
    //
    // So the name is worth a short wait and nothing more. Losing it costs a
    // listing of the user's own saved work until the next sign-in; losing the
    // redirect costs the session.
    try {
      var meCtl = new AbortController();
      var meTimer = setTimeout(function () { meCtl.abort(); }, USERMGMT_ME_TIMEOUT_MS);
      try {
        var me = await fetch(USERMGMT_ME_URL, {
          headers: { Authorization: "Bearer " + data.access_token },
          signal: meCtl.signal
        });
        if (me.ok) {
          var meBody = await me.json();
          if (meBody && meBody.username) localStorage.setItem("atlas_username", meBody.username);
        } else {
          console.warn("[login] usermgmt /me returned " + me.status + "; saved cohorts may not be listed");
        }
      } finally {
        clearTimeout(meTimer);
      }
    } catch (e) {
      // Deliberately not falling back to an id_token claim: a wrong name shows
      // one user another's saved work, which is worse than showing none.
      console.warn("[login] could not resolve the username from usermgmt: " + e);
    }
    // Persist the refresh token + the bits the token-keeper needs to renew it,
    // so the session survives the (~1h) access-token TTL without re-prompting.
    if (data.refresh_token) localStorage.setItem("atlas_refresh_token", data.refresh_token);
    localStorage.setItem("atlas_oidc_cfg", JSON.stringify({
      tokenEndpoint: cfg.token,
      clientId: cfg.clientId,
      resource: cfg.resource,
      scope: cfg.scope
    }));
    sessionStorage.removeItem(VERIFIER_KEY);
    var ret = safeReturn(sessionStorage.getItem(RETURN_KEY));
    sessionStorage.removeItem(RETURN_KEY);
    location.replace(ret);
  }

  async function startLogin(cfg, params) {
    var verifier = randomString(32);
    var state = randomString(16);
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
    sessionStorage.setItem(RETURN_KEY, resolveReturnTarget(params));
    var challenge = b64url(await sha256(verifier));
    var url = new URL(cfg.authorize);
    url.searchParams.set("client_id", cfg.clientId);
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", cfg.scope);
    url.searchParams.set("resource", cfg.resource);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("state", state);
    location.assign(url.toString());
  }

  (async function () {
    try {
      var cfg = getConfig();
      var params = new URLSearchParams(location.search);
      if (params.get("error")) { fail(params.get("error_description") || params.get("error")); return; }
      if (params.get("code")) { await handleCallback(cfg, params); }
      else { await startLogin(cfg, params); }
    } catch (e) {
      fail((e && e.message) || String(e));
    }
  })();
})();
