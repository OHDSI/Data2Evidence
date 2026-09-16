/*
 * Federated sign-in options for the D2E sign-in page. Pure functions, attached
 * to globalThis so the page loads them with a plain <script> and tests import
 * the same file.
 */
(function (root) {
  "use strict";

  var TREX_BASE = "/trex/auth/v1";
  var LABELS = { logto: "Logto" };
  var MESSAGES = {
    no_account: "No D2E account is linked to this sign-in. Ask your administrator.",
    account_disabled: "This account is deactivated.",
  };

  function externalProviders(settings) {
    var external = (settings && settings.external) || {};
    return Object.keys(external)
      .filter(function (id) { return id !== "email" && external[id] === true; })
      .map(function (id) {
        return { id: id, label: LABELS[id] || id.charAt(0).toUpperCase() + id.slice(1) };
      });
  }

  function authorizeHref(id, returnTo) {
    return TREX_BASE + "/authorize?provider=" + encodeURIComponent(id) +
      "&redirect_to=" + encodeURIComponent(returnTo);
  }

  function errorMessage(code) {
    if (!code) return null;
    return MESSAGES[code] || "Sign-in failed. Please try again.";
  }

  root.D2ELoginProviders = {
    externalProviders: externalProviders,
    authorizeHref: authorizeHref,
    errorMessage: errorMessage,
  };
})(globalThis);
