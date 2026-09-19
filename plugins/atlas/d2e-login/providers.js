/*
 * Federated sign-in options for the D2E sign-in page. Pure functions, attached
 * to globalThis so the page loads them with a plain <script> and tests import
 * the same file.
 */
(function (root) {
  "use strict";

  var TREX_BASE = "/trex/auth/v1";
  var AUTHORIZE_PATH = "/trex/oidc/oauth2/authorize";
  var FALLBACK_RETURN = "/atlas/";
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

  /**
   * Where to send the browser once it has a trex session.
   *
   * trex's OIDC provider sends no `return_to`. It sends the whole authorization
   * request back, re-serialized and signed (`sig`, `exp`, `ba_iat`, one
   * `ba_param` per signed name), and expects it handed back to
   * /oauth2/authorize, which re-reads the plain parameters and ignores the
   * signature.
   *
   * The query is opaque: only what the relying party actually sent appears, so
   * there is no list to rebuild it from and the raw parameter text is passed
   * through untouched. Re-serializing it — with URLSearchParams, say — would
   * re-encode bytes the provider chose, and `sig` is standard base64 rather
   * than base64url, so it is exactly the value that must not be normalised.
   *
   * `prompt` is the one thing removed. Carried back with a live session it
   * returns the browser here again, indefinitely, with nothing to distinguish
   * the second pass from the first. Removing it breaks `sig`, which is
   * harmless only because /oauth2/authorize never verifies it — and which is
   * why this may only ever bounce there, never to /oauth2/consent or
   * /oauth2/continue.
   *
   * The destination is a constant same-origin path, so unlike the old
   * `return_to` there is nothing here for an attacker to point anywhere.
   */
  function continueUrl(search) {
    var raw = String(search == null ? "" : search).replace(/^\?/, "");
    var signed = false;
    var kept = [];
    raw.split("&").forEach(function (pair) {
      if (!pair) return;
      var name = pair.split("=")[0];
      if (name === "sig") signed = true;
      if (name === "prompt") return;
      kept.push(pair);
    });
    // No signature means nobody was sent here by the provider — a person
    // opening the page directly, or the federation loop's `?manual`.
    if (!signed) return FALLBACK_RETURN;
    return AUTHORIZE_PATH + "?" + kept.join("&");
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
    continueUrl: continueUrl,
    authorizeHref: authorizeHref,
    errorMessage: errorMessage,
  };
})(globalThis);
