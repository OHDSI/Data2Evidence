(function () {
  "use strict";

  var SELECTOR = '[data-testid="datasource-selector"]';
  var READY_CLASS = "d2e-ds-picker";
  var TOKEN_KEY = "bearerToken";
  var NAV_ACTIVE = "nav-bar__nav-item--active";
  var NAV_LABEL = "Data Sources";
  var PLUGIN_URL = location.pathname.replace(/[^/]*$/, "") + "plugins/datasource/index.system.js";

  var style = document.createElement("style");
  style.textContent = "html." + READY_CLASS + " " + SELECTOR + "{display:none!important}";
  document.head.appendChild(style);

  var mod = null;
  var host = null;
  var handle = null;
  var currentKey = null;
  var currentToken = null;
  var mounting = false;
  var fallback = null;
  var scheduled = false;
  var navMarked = null;

  function route() {
    var m = location.hash.match(/^#\/datasources\/([^/?#]+)(?:\/([^/?#]+))?/);
    return m ? { key: decodeURIComponent(m[1]), report: m[2] || "dashboard" } : null;
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function onFallback() {
    var r = route();
    fallback = { key: r ? r.key : null, token: getToken() };
    setTimeout(detach, 0);
  }

  function detach() {
    document.documentElement.classList.remove(READY_CLASS);
    if (handle) handle.unmount();
    if (host) host.remove();
    host = null;
    handle = null;
  }

  function syncNav() {
    var item = null;
    if (/^#\/(plugins\/)?datasources(\/|$|\?)/.test(location.hash)) {
      var links = document.querySelectorAll(".nav-bar__nav-item > .nav-bar__nav-link");
      for (var i = 0; i < links.length; i++) {
        if (links[i].textContent.trim() === NAV_LABEL) item = links[i].parentElement;
      }
    }
    if (navMarked && navMarked !== item) {
      navMarked.classList.remove(NAV_ACTIVE);
      navMarked = null;
    }
    if (item && !item.classList.contains(NAV_ACTIVE)) {
      item.classList.add(NAV_ACTIVE);
      navMarked = item;
    }
  }

  function sync() {
    scheduled = false;
    var r = route();
    syncNav();
    if (fallback && (!r || r.key !== fallback.key || getToken() !== fallback.token)) fallback = null;
    if (fallback) return;
    var core = r && document.querySelector(SELECTOR);
    if (!core) {
      if (host && !mounting) detach();
      return;
    }
    if (host && host.isConnected && host.parentElement === core.parentElement) {
      if (host.nextElementSibling !== core) core.parentElement.insertBefore(host, core);
      var token = getToken();
      if (handle && (r.key !== currentKey || token !== currentToken)) {
        currentKey = r.key;
        currentToken = token;
        handle.update(r.key);
      }
      return;
    }
    if (mounting) return;
    if (host) detach();
    if (!window.System || typeof window.System.import !== "function") return;

    mounting = true;
    host = document.createElement("div");
    host.setAttribute("data-testid", "d2e-datasource-picker-host");
    host.style.display = "contents";
    core.parentElement.insertBefore(host, core);
    window.System.import(PLUGIN_URL)
      .then(function (m) {
        mod = m;
        if (!host || !host.isConnected) return;
        currentKey = r.key;
        currentToken = getToken();
        handle = mod.mountPicker(host, { currentKey: r.key, getToken: getToken, onFallback: onFallback });
        if (!fallback) document.documentElement.classList.add(READY_CLASS);
      })
      .catch(function (e) {
        console.warn("[datasource-picker] keeping Atlas3 selector:", e);
        detach();
      })
      .finally(function () {
        mounting = false;
        schedule();
      });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  }

  document.addEventListener("click", function (e) {
    if (!mod) return;
    var item = e.target && e.target.closest
      ? e.target.closest('[data-testid="datasource-sidebar-' + mod.DESCRIPTION_REPORT + '"]')
      : null;
    var r = route();
    if (!item || !r) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    location.hash = mod.pluginSourceHash(r.key);
  }, true);

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("hashchange", schedule);
})();
