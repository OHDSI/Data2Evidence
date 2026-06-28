/*
 * MRI Patient Analytics host page (served at /atlas-mri/).
 *
 * This page runs vue-mri in its OWN document, embedded by the Atlas3 plugin via
 * an <iframe>. Because it's a separate document, vue-mri's SAP UI5 + Vuetify CSS
 * is fully isolated and cannot leak into the Atlas3 host (the reason we moved
 * off in-DOM injection). It loads vue-mri the same way the d2e portal does
 * (apps/portal/src/plugins/mri/utils/PAPlugin.tsx): register d4l web components,
 * bootstrap SAP UI5, then load vue-mri's CSS + ES-module JS.
 *
 * Same-origin with /atlas, so it reads the auth token (bearerToken) and the
 * selected dataset (selectedVocabulary) straight from shared localStorage.
 */
(function () {
  "use strict";

  var TOKEN_KEY = "bearerToken";
  // Root-relative so assets inherit the page's origin and scheme (always https
  // in deployment); avoids building absolute URLs from location.origin.
  var D2E = "/d2e/";
  var ASSETS_URL = D2E + "mri/assets.json";
  var SAP_CORE_URL = D2E + "ui/sap-ui-core.js";
  var D4L_LOADER = "/atlas/d4l-ui/d4l-ui.esm.js";

  // Same-origin with the Atlas3 host, so token + dataset come straight from the
  // shared localStorage the parent populates (never from the URL).
  function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
  function getStudyId() { return localStorage.getItem("selectedVocabulary") || ""; }
  // vue-mri matches the current user's own bookmarks/cohort definitions by username.
  function getUsername() { return localStorage.getItem("atlas_username") || ""; }

  // portalAPI consumed by vue-mri's getPortalAPI().
  var container = document.querySelector(".plugin-container");
  container.portalAPI = {
    getToken: function () { return Promise.resolve(getToken()); },
    qeSvcUrl: "/d2e",
    studyId: getStudyId(),
    releaseId: "1",
    username: getUsername(),
    locale: localStorage.getItem("locale") || "en",
    toggleAtlas: function () {},
    isLocal: false,
    debug: false,
  };

  // vue-mri's getPortalAPI() only resolves when exactly one .plugin-container
  // exists, but vue-mri renders its own — ensure the lookup returns ours.
  var origGEBCN = Document.prototype.getElementsByClassName;
  Document.prototype.getElementsByClassName = function (cn) {
    var res = origGEBCN.call(this, cn);
    if (cn === "plugin-container" && res.length > 1) {
      for (var i = 0; i < res.length; i++) {
        if (res[i].portalAPI) {
          var one = [res[i]];
          one.item = function (x) { return this[x] || null; };
          Object.defineProperty(one, "length", { value: 1 });
          return one;
        }
      }
    }
    return res;
  };

  // Attach the bearer token to vue-mri's /d2e and /mri fetches.
  var origFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    if (/\/d2e\/|\/mri\//.test(url)) {
      init = Object.assign({}, init);
      var h = new Headers((init && init.headers) || (typeof input !== "string" && input.headers) || {});
      var t = getToken();
      if (t && !h.has("Authorization")) h.set("Authorization", "Bearer " + t);
      init.headers = h;
    }
    return origFetch(input, init);
  };

  function loadModule(src) {
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      s.type = "module";
      s.src = src;
      s.onload = function () { resolve(); };
      s.onerror = function () { resolve(); };
      document.head.appendChild(s);
    });
  }

  function loadStyle(href) {
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  }

  function loadSap(onload) {
    var s = document.createElement("script");
    s.src = SAP_CORE_URL;
    s.id = "sap-ui-bootstrap";
    s.setAttribute("data-sap-ui-theme", "sap_belize");
    s.setAttribute("data-sap-ui-libs", "sap.m");
    s.setAttribute("data-sap-ui-compatVersion", "edge");
    s.setAttribute("data-sap-ui-preload", "async");
    s.setAttribute("data-sap-ui-resourceroots", JSON.stringify({
      hc: D2E + "hc",
      "hc.hph": D2E + "hc/hph",
      "hc.hph.cdw.config": D2E + "hc/hph/cdw/config",
      "hc.mri.pa.config": D2E + "hc/mri/pa/config",
    }));
    s.onload = onload;
    document.head.appendChild(s);
  }

  (async function () {
    try {
      await loadModule(D4L_LOADER); // register d4l web components first
      var resp = await fetch(ASSETS_URL);
      var manifest = await resp.json();
      loadSap(function () {
        // Asset filenames are content-hashed, so load them as-is — no cache-bust
        // query (a per-load query would force a re-download every time and defeat
        // both browser caching and the prefetch below).
        (manifest.css || []).forEach(loadStyle);
        (manifest.js || []).forEach(function (src) { loadModule(src); });
      });
    } catch (err) {
      document.body.innerHTML = '<p style="font-family:sans-serif;padding:16px;color:#b91c1c">Failed to load Patient Analytics: ' + (err && err.message) + "</p>";
    }
  })();
})();
