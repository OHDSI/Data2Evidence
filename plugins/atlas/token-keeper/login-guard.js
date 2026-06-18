/*
 * Atlas3 standalone login guard (served at /atlas, injected into index.html).
 *
 * In the d2e setup Atlas3 must authenticate via the Logto bridge (/atlas-login/),
 * which yields an RS256 Logto token that trex accepts. Atlas3 ALSO has a built-in
 * "OpenID" path through WebAPI's native OIDC; when the session is gone it can
 * auto-bounce the browser to "/atlas/#/welcome&token=<HS256 WebAPI token>". That
 * is broken twice over: the URL is malformed (Atlas3's router only reads a token
 * from "?token=", not "&token="), and the token is an HS256 WebAPI token that
 * trex's authn middleware rejects. The net effect is the login dialog/loop.
 *
 * This guard runs before Atlas3 boots: if there is no usable token (localStorage
 * or cookie) — or we've landed on the broken WebAPI welcome URL — it redirects to
 * the Logto bridge, which silently re-auths via the existing Logto SSO session
 * (no password prompt when it's still valid) and returns with a good RS256 token.
 */
(function () {
  "use strict";

  var TOKEN_KEY = "bearerToken";
  var GUARD_TS = "atlas_login_guard_ts";
  var LOOP_GUARD_MS = 8000; // don't bounce more than once per ~8s (loop safety)

  function tokenValid(t) {
    if (!t) return false;
    try {
      var claims = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return !!claims.exp && claims.exp * 1000 > Date.now() + 5000;
    } catch (e) {
      return false;
    }
  }

  function currentToken() {
    var t = localStorage.getItem(TOKEN_KEY);
    if (t) return t;
    var m = document.cookie.match(/(?:^|;\s*)bearerToken=([^;]+)/);
    if (!m) return null;
    var v = decodeURIComponent(m[1]);
    return v.indexOf("Bearer ") === 0 ? v.slice(7) : v;
  }

  var hash = location.hash || "";
  // Atlas3 fell into WebAPI's native OIDC (HS256, trex-rejected, malformed URL).
  var onBrokenWelcome = /#\/welcome[&?]token=/.test(hash);

  if (onBrokenWelcome || !tokenValid(currentToken())) {
    var last = parseInt(sessionStorage.getItem(GUARD_TS) || "0", 10);
    if (Date.now() - last > LOOP_GUARD_MS) {
      sessionStorage.setItem(GUARD_TS, String(Date.now()));
      // Strip the broken welcome token; return to a sane route after re-auth.
      var ret = onBrokenWelcome || !hash ? "#/cohorts" : hash;
      location.replace("/atlas-login/?redirectUrl=" + encodeURIComponent(ret));
    }
  } else {
    // Logged in: enforce the admin feature flags (Setup -> Feature flags).
    enforceFeatures(currentToken());
  }

  function isDisabled(list, name) {
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].feature === name) return list[i].isEnabled === false;
    }
    return false;
  }

  function enforceFeatures(token) {
    if (!token) return;
    fetch("/d2e/system-portal/feature/list", { headers: { Authorization: "Bearer " + token } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (list) {
        if (!Array.isArray(list)) return;
        // "atlas" disabled -> block direct /atlas access, bounce to the portal.
        if (isDisabled(list, "atlas")) { location.replace("/d2e/portal"); return; }
        // "pythia" disabled -> hide the Pythia FAB (the agent's entry point). A
        // global style works regardless of when Atlas3 teleports the FAB to body.
        if (isDisabled(list, "pythia")) {
          var s = document.createElement("style");
          s.textContent = '[data-testid="plugin-fab-pythia-plugin"]{display:none!important}';
          document.head.appendChild(s);
        }
      })
      .catch(function () { /* fail open */ });
  }
})();
