/*
 * Atlas3 login guard (injected into index.html, runs before Atlas3 boots).
 * If there's no usable token — or we've landed on Atlas3's broken WebAPI
 * "/#/welcome&token=<HS256>" fallback (which trex rejects) — redirect through the
 * Logto bridge (/atlas-login/) for silent SSO. Also enforces the admin feature
 * flags: blocks /atlas when "atlas" is off, hides the Pythia FAB when "pythia" is off.
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
        // "pythia" disabled -> hide the Pythia FAB via a global style.
        if (isDisabled(list, "pythia")) {
          var s = document.createElement("style");
          s.textContent = '[data-testid="plugin-fab-pythia-plugin"]{display:none!important}';
          document.head.appendChild(s);
        }
      })
      .catch(function () { /* fail open */ });
  }
})();
