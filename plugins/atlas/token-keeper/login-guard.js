/*
 * Atlas3 login guard (injected into index.html, runs before Atlas3 boots).
 * If there's no usable token — or we've landed on Atlas3's broken WebAPI
 * "/#/welcome&token=<HS256>" fallback (which trex rejects) — redirect through the
 * Logto bridge (/atlas-login/) for silent SSO. Also enforces the admin feature
 * flags: blocks /atlas when "atlas" is off, hides the Pythia FAB when "pythia" is off,
 * and drops flag-gated plugins from the Atlas3 plugin manifest.
 */
(function () {
  "use strict";

  var TOKEN_KEY = "bearerToken";
  var GUARD_TS = "atlas_login_guard_ts";
  var LOOP_GUARD_MS = 8000; // don't bounce more than once per ~8s (loop safety)

  // Feature flag -> the plugin id it gates in config/plugins.json. Dropping the
  // entry (rather than hiding its menu item) also stops the plugin being loaded.
  var PLUGIN_GATES = { sibyl: "studies-plugin", dataExploration: "patient-analytics" };

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

  var token = currentToken();
  // One flag request feeds both gates. Wrapping fetch has to happen synchronously,
  // before Atlas3's module script runs, so the manifest gate is installed here
  // rather than inside the logged-in branch below.
  var flags = fetchFlags(tokenValid(token) ? token : null);
  gatePluginManifest(flags);

  if (onBrokenWelcome || !tokenValid(token)) {
    var last = parseInt(sessionStorage.getItem(GUARD_TS) || "0", 10);
    if (Date.now() - last > LOOP_GUARD_MS) {
      sessionStorage.setItem(GUARD_TS, String(Date.now()));
      // Strip the broken welcome token; return to a sane route after re-auth.
      var ret = onBrokenWelcome || !hash ? "#/cohorts" : hash;
      location.replace("/atlas-login/?redirectUrl=" + encodeURIComponent(ret));
    }
  } else {
    // Logged in: enforce the admin feature flags (Setup -> Feature flags).
    enforceFeatures(flags);
  }

  function isDisabled(list, name) {
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].feature === name) return list[i].isEnabled === false;
    }
    return false;
  }

  // Only an explicit isEnabled wins. An unreadable list or an unknown flag reads as
  // off, because every plugin gate here ships defaultEnabled: false.
  function isEnabled(list, name) {
    if (!Array.isArray(list)) return false;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].feature === name) return list[i].isEnabled === true;
    }
    return false;
  }

  function fetchFlags(token) {
    if (!token) return Promise.resolve(null);
    return fetch("/d2e/system-portal/feature/list", { headers: { Authorization: "Bearer " + token } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function enforceFeatures(flags) {
    flags.then(function (list) {
      // Fail open: an unreadable flag list must not bounce users out of Atlas.
      if (!Array.isArray(list)) return;
      // "atlas" disabled -> block direct /atlas access, bounce to the portal.
      if (isDisabled(list, "atlas")) { location.replace("/d2e/portal"); return; }
      // "pythia" disabled -> hide the Pythia FAB via a global style.
      if (isDisabled(list, "pythia")) {
        var s = document.createElement("style");
        s.textContent = '[data-testid="plugin-fab-pythia-plugin"]{display:none!important}';
        document.head.appendChild(s);
      }
    });
  }

  // Atlas3 reads config/plugins.json at boot to decide which plugins to mount and
  // which menu items to render. Drop the gated entries from that response so a
  // disabled plugin is neither loaded nor listed.
  function gatePluginManifest(flags) {
    var origFetch = window.fetch;
    window.fetch = function (input) {
      var url = String(typeof input === "string" ? input : (input && input.url) || "");
      var res = origFetch.apply(this, arguments);
      if (!/config\/plugins\.json(\?|$)/.test(url)) return res;
      return Promise.all([res, flags]).then(function (out) {
        var r = out[0], list = out[1];
        if (!r.ok) return r;
        return r
          .clone()
          .json()
          .then(function (plugins) {
            if (!Array.isArray(plugins)) return r;
            var kept = plugins.filter(function (p) {
              for (var flag in PLUGIN_GATES) {
                if (PLUGIN_GATES[flag] === (p && p.id)) return isEnabled(list, flag);
              }
              return true;
            });
            return new Response(JSON.stringify(kept), {
              status: r.status,
              statusText: r.statusText,
              headers: r.headers
            });
          })
          .catch(function () { return r; });
      });
    };
  }
})();
