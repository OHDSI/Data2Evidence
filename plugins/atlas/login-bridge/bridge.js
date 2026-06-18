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
  var RESOURCE = "https://alp-default";
  var REDIRECT_URI = location.origin + "/atlas-login/";
  var DEFAULT_RETURN = "/atlas/#/cohorts";
  var VERIFIER_KEY = "atlas_pkce_verifier";
  var RETURN_KEY = "atlas_login_return_to";

  function fail(msg) {
    var s = document.getElementById("spinner");
    if (s) s.style.display = "none";
    var el = document.getElementById("status");
    if (el) { el.className = "err"; el.textContent = "Sign-in failed: " + msg; }
    console.error("[atlas-login]", msg);
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
      scope: scope.trim()
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
    if (rd.charAt(0) === "/") return rd;
    return "/atlas/#/" + rd;
  }

  async function handleCallback(cfg, params) {
    var verifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!verifier) { fail("missing PKCE verifier (stale callback)"); return; }
    var body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("code", params.get("code"));
    body.set("redirect_uri", REDIRECT_URI);
    body.set("client_id", cfg.clientId);
    body.set("code_verifier", verifier);
    body.set("resource", RESOURCE);

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
    // The access token has no profile claims, but vue-mri needs the d2e username
    // (= the id_token `username` claim, e.g. "admin") to match the current user's
    // own bookmarks/cohort definitions. Capture it from the id_token.
    try {
      if (data.id_token) {
        var idc = JSON.parse(atob(data.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        var uname = idc.username || idc.preferred_username || idc.email || idc.name || idc.sub || "";
        if (uname) localStorage.setItem("atlas_username", uname);
      }
    } catch (e) { /* ignore */ }
    // Persist the refresh token + the bits the token-keeper needs to renew it,
    // so the session survives the (~1h) access-token TTL without re-prompting.
    if (data.refresh_token) localStorage.setItem("atlas_refresh_token", data.refresh_token);
    localStorage.setItem("atlas_oidc_cfg", JSON.stringify({
      tokenEndpoint: cfg.token,
      clientId: cfg.clientId,
      resource: RESOURCE,
      scope: cfg.scope
    }));
    sessionStorage.removeItem(VERIFIER_KEY);
    var ret = sessionStorage.getItem(RETURN_KEY) || DEFAULT_RETURN;
    sessionStorage.removeItem(RETURN_KEY);
    location.replace(ret);
  }

  async function startLogin(cfg, params) {
    var verifier = randomString(32);
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(RETURN_KEY, resolveReturnTarget(params));
    var challenge = b64url(await sha256(verifier));
    var url = new URL(cfg.authorize);
    url.searchParams.set("client_id", cfg.clientId);
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", cfg.scope);
    url.searchParams.set("resource", RESOURCE);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("state", randomString(8));
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
