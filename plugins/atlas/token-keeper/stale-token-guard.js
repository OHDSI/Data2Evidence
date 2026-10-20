/*
 * Atlas3 stale-token guard: on a same-origin stale-token response (401 +
 * x-token-stale/AUTHZ_STALE_TOKEN, or trex's generic 403 "could not resolve user
 * roles"), refresh via token-keeper and replay. A probe surfaces role changes
 * during /WebAPI-only use, which trex never flags.
 */
(function () {
  "use strict";

  var TOKEN_KEY = "bearerToken";
  var STALE_MAX_RETRIES = 3;
  var PROBE_URL = "/d2e/usermgmt/api/me/is_token_valid_internal";
  var PROBE_MS = 60000;

  var origFetch = window.fetch;

  function sameOrigin(url) {
    try { return new URL(url, location.origin).origin === location.origin; }
    catch (e) { return false; }
  }

  async function isStale(resp) {
    if (resp.status === 401) {
      try { if (resp.headers && resp.headers.get("x-token-stale") === "1") return true; } catch (e) { /* ignore */ }
      try {
        var body = await resp.clone().json();
        if (body && (body.code === "AUTHZ_STALE_TOKEN" ||
          (body.response && body.response.data && body.response.data.code === "AUTHZ_STALE_TOKEN"))) return true;
      } catch (e) { /* non-JSON */ }
      return false;
    }
    if (resp.status === 403) {
      // trex drops the stale signal and returns this generic 403 for a stale-token role lookup.
      try {
        var b = await resp.clone().json();
        if (b && typeof b.error === "string" && b.error.indexOf("could not resolve user roles") !== -1) return true;
      } catch (e) { /* non-JSON */ }
      return false;
    }
    return false;
  }

  function withAuth(init, token) {
    var next = {};
    for (var k in init) { if (Object.prototype.hasOwnProperty.call(init, k)) next[k] = init[k]; }
    var headers = new Headers((init && init.headers) || {});
    headers.set("Authorization", "Bearer " + token);
    next.headers = headers;
    return next;
  }

  async function refresh() {
    var keeper = window.__atlasTokenKeeper;
    return keeper && typeof keeper.refresh === "function" ? await keeper.refresh() : null;
  }

  async function guard(input, init) {
    var resp = await origFetch.call(this, input, init);
    if (typeof input !== "string" || !sameOrigin(input)) return resp;
    var attempt = 0;
    var currentInit = init;
    while (attempt < STALE_MAX_RETRIES && (await isStale(resp))) {
      var token = await refresh();
      if (!token) return resp;
      attempt += 1;
      currentInit = withAuth(currentInit, token);
      resp = await origFetch.call(this, input, currentInit);
    }
    return resp;
  }

  window.fetch = function (input, init) {
    return guard.call(this, input, init);
  };

  function probe() {
    var token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    window.fetch(PROBE_URL, { headers: { Authorization: "Bearer " + token } }).catch(function () {});
  }
  void probe();
  setInterval(probe, PROBE_MS);
})();
