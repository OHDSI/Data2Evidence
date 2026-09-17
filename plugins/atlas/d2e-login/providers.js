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

  /**
   * Whether trex accepts native password sign-in, which it reports as
   * `external.email` (TREX_NATIVE_PASSWORD_LOGIN_ENABLED). Only an explicit
   * `false` hides the form: a missing or malformed answer must not take a
   * trex-only installation's one way in away.
   */
  function passwordLoginEnabled(settings) {
    return !(settings && settings.external && settings.external.email === false);
  }

  /**
   * The provider to send the browser to without showing the page, or null.
   *
   * Only when the page would offer exactly one way in anyway: native sign-in
   * off and a single federated provider. Never when trex has just refused a
   * sign-in (`error` is set) — the upstream session is usually still live, so
   * redirecting would bounce straight back with the same refusal, forever, and
   * the person would never see why. `manual` keeps the page up on request.
   */
  function autoRedirectProvider(settings, query) {
    var q = query || {};
    if (q.error || q.manual) return null;
    if (passwordLoginEnabled(settings)) return null;
    var providers = externalProviders(settings);
    return providers.length === 1 ? providers[0].id : null;
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
    passwordLoginEnabled: passwordLoginEnabled,
    autoRedirectProvider: autoRedirectProvider,
    authorizeHref: authorizeHref,
    errorMessage: errorMessage,
  };
})(globalThis);
