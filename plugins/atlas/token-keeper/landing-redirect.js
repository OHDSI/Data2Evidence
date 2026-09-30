/*
 * Atlas3 landing route for d2e (injected into index.html, runs before Atlas3 boots).
 *
 * d2e lands users on the Data Sources overview rather than Atlas3's LandingView
 * welcome screen. That is configuration, not patching: Atlas3 redirects the "/"
 * route to settings.theme.logoNavigateTo, which plugins.standalone.json points
 * at /plugins/datasources/ --
 *
 *   router.beforeEach((to, from, next) => {
 *     if (to.path === "/") { const t = config.getLogoNavigateTo()
 *       if (t && t !== "/") { next(t); return } }
 *     next() })
 *
 * -- which covers a bare /atlas/ visit, the logo, and the OIDC callback (whose
 * handler ends in next(stored || "/")).
 *
 * This file exists for the one entry point that redirect cannot see, plus the
 * one it cannot be read from.
 */
(function () {
  "use strict";

  // The landing route, published for login-guard.js, which decides where
  // sign-in returns to and cannot read Atlas3's plugin manifest. Keeping it here
  // means the route is declared in the manifest and mirrored in exactly one
  // script, rather than spelled out in each.
  var LANDING = "#/plugins/datasources/";
  window.D2E_ATLAS_LANDING_HASH = LANDING;

  // Atlas3 has no /welcome route, so this falls to the not-found catch-all --
  // which renders LandingView, bypassing the "/" redirect entirely. WebAPI sends
  // browsers here (SECURITY_AUTH_OAUTH_CALLBACK_UI in docker-compose.yml).
  //
  // Only the bare route. The "#/welcome&token=" and "#/welcome?code=" forms are
  // login-guard.js's (it bounces them through /atlas-login/), and #/oauth,
  // #/openid and #/saml callback routes render LandingView to COMPLETE a
  // sign-in -- redirecting any of those would break the login flow.
  function redirect() {
    if ((location.hash || "") !== "#/welcome") return;
    // replace, not assign: a route users never asked for must not become a
    // history entry that Back returns them to.
    location.replace(location.pathname + location.search + LANDING);
  }

  redirect();
  // A hash-only change never reloads the document, so the boot-time call above
  // cannot see a later navigation to #/welcome.
  window.addEventListener("hashchange", redirect);
})();
