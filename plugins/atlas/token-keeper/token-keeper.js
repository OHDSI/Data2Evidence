/*
 * Atlas3 token keeper (injected into index.html): silently refreshes the Logto
 * bearerToken (stored by /atlas-login/) with the stored refresh token before it
 * expires (~1h), so the session stays alive and the login dialog doesn't reappear.
 */
(function () {
  "use strict";

  var TOKEN_KEY = "bearerToken";
  var RT_KEY = "atlas_refresh_token";
  var CFG_KEY = "atlas_oidc_cfg";
  var CHECK_MS = 60000;        // check once a minute
  var REFRESH_BEFORE_S = 300;  // refresh when <5 min of validity remain

  function decodeExp(jwt) {
    try {
      var payload = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(payload)).exp || 0;
    } catch (e) {
      return 0;
    }
  }

  var refreshing = false;
  async function refresh() {
    if (refreshing) return;
    var rt = localStorage.getItem(RT_KEY);
    var cfgRaw = localStorage.getItem(CFG_KEY);
    if (!rt || !cfgRaw) return;
    var cfg;
    try { cfg = JSON.parse(cfgRaw); } catch (e) { return; }
    if (!cfg.tokenEndpoint || !cfg.clientId) return;

    refreshing = true;
    try {
      var body = new URLSearchParams();
      body.set("grant_type", "refresh_token");
      body.set("refresh_token", rt);
      body.set("client_id", cfg.clientId);
      if (cfg.resource) body.set("resource", cfg.resource);
      // Omit scope: re-requesting offline_access on refresh is rejected by Logto
      // ("refresh token missing requested scope"); reuse the original grant.

      var resp = await fetch(cfg.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!resp.ok) {
        // Refresh token invalid/expired — drop it so the user is re-prompted to log in.
        localStorage.removeItem(RT_KEY);
        return;
      }
      var data = await resp.json();
      if (data.access_token) {
        localStorage.setItem(TOKEN_KEY, data.access_token);
        // Same-tab localStorage writes do NOT fire a 'storage' event, so Atlas3's
        // cross-tab sync (which listens for storage events on bearerToken and calls
        // setToken -> updates its in-memory token + the bearerToken cookie + user)
        // never sees this refresh. Without that, Atlas3 keeps using the now-stale
        // in-memory token and pops the login dialog the moment it expires, even
        // though localStorage is fresh. Dispatch a synthetic StorageEvent so Atlas3
        // adopts the refreshed token in this tab too.
        try {
          window.dispatchEvent(new StorageEvent("storage", {
            key: TOKEN_KEY,
            newValue: data.access_token,
            storageArea: localStorage,
          }));
        } catch (e) { /* StorageEvent ctor unsupported — reload will pick it up */ }
      }
      if (data.refresh_token) localStorage.setItem(RT_KEY, data.refresh_token); // rotating RTs
    } catch (e) {
      /* network error — try again next tick */
    } finally {
      refreshing = false;
    }
  }

  function tick() {
    var token = localStorage.getItem(TOKEN_KEY);
    if (!token) return; // not logged in — nothing to keep alive
    var exp = decodeExp(token);
    var now = Math.floor(Date.now() / 1000);
    if (!exp || exp - now < REFRESH_BEFORE_S) {
      void refresh();
    }
  }

  tick();
  setInterval(tick, CHECK_MS);
})();
