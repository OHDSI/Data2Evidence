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
   * The bounce for one raw query string, or null if it is not a signed
   * authorization request.
   *
   * The query is opaque: only what the relying party actually sent appears, so
   * there is no list to rebuild it from and each parameter is carried as the
   * raw text it arrived as. Round-tripping it through URLSearchParams would
   * agree on everything the provider emits today — `sig` included, standard
   * base64 or not — but the two encoders do not agree in general:
   * form-urlencoding escapes `~!'()` where encodeURIComponent leaves them
   * alone, so a relying party's `state` or `nonce` containing one of those
   * would come back re-encoded. Carrying the text is what makes that
   * impossible rather than merely unobserved.
   *
   * `prompt` is the one thing removed. Carried back with a live session it
   * returns the browser here again, indefinitely, with nothing to distinguish
   * the second pass from the first. Removing it breaks `sig`, which is
   * harmless only because /oauth2/authorize never verifies it — and which is
   * why this may only ever bounce there, never to /oauth2/consent or
   * /oauth2/continue.
   */
  function bounceQuery(raw) {
    var signed = false;
    var kept = [];
    raw.split("&").forEach(function (pair) {
      if (!pair) return;
      var name = pair.split("=")[0];
      if (name === "sig") signed = true;
      if (name === "prompt") return;
      kept.push(pair);
    });
    // No signature means nobody was sent here by the provider.
    return signed ? AUTHORIZE_PATH + "?" + kept.join("&") : null;
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
   * Its federation half still uses `return_to`: a refused upstream sign-in
   * comes back as `?error=<code>&return_to=<the query trex was handed>`, which
   * by now is the signed authorization request one level of percent-encoding
   * down. Unwrapping it is what keeps a refusal from costing the whole
   * authorization request — the person retries on this page instead of the
   * relying party starting over. Only the wrapped *query* is taken: the
   * destination is a constant same-origin path either way, so unlike the old
   * return_to there is nothing here for an attacker to point anywhere.
   *
   * URLSearchParams is safe for that one read because it is a decode, and trex
   * wrote the value with the matching encoder (URL.searchParams.set), so the
   * inner text comes back byte for byte.
   */
  function continueUrl(search) {
    var raw = String(search == null ? "" : search).replace(/^\?/, "");
    var direct = bounceQuery(raw);
    if (direct) return direct;
    var returnTo = new URLSearchParams(raw).get("return_to");
    var query = returnTo ? returnTo.indexOf("?") : -1;
    return (query !== -1 && bounceQuery(returnTo.slice(query + 1))) || FALLBACK_RETURN;
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
