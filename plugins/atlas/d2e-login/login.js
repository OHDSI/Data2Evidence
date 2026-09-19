/*
 * D2E sign-in page.
 *
 * trex's OIDC provider hosts no login UI: when /oauth2/authorize finds no
 * session it sends the browser here with the whole authorization request
 * re-serialized and signed. This page authenticates against trex's native IdP,
 * has trex set its session cookie, and hands that query straight back to
 * /oauth2/authorize, which now finds a session and issues the code.
 *
 * Plain ES, served as static files — the same shape as the other static pages
 * under /atlas, so it needs no build step.
 */
(function () {
  "use strict";

  var TREX_BASE = "/trex/auth/v1";
  var FALLBACK_RETURN = "/atlas/";

  var form = document.getElementById("form");
  var identifierEl = document.getElementById("identifier");
  var passwordEl = document.getElementById("password");
  var submitEl = document.getElementById("submit");
  var errorEl = document.getElementById("error");

  var providersEl = document.getElementById("providers");
  var dividerEl = document.getElementById("divider");
  // providers.js is loaded from a separate <script> tag: if that request
  // fails, is blocked, or is served inconsistently, this is undefined. The
  // password form must still work, so the federated extras simply stay
  // absent rather than throwing before form.addEventListener runs below.
  var P = window.D2ELoginProviders || null;

  // A constant path plus the query the provider handed over, so there is no
  // caller-supplied destination left to check. Without providers.js there is
  // nothing to build it with, and signing in simply lands on the portal.
  var returnTo = P ? P.continueUrl(location.search) : FALLBACK_RETURN;

  if (P) {
    // A refused federated sign-in comes back here with its reason.
    var refusal = P.errorMessage(new URLSearchParams(location.search).get("error"));
    if (refusal) errorEl.textContent = refusal;

    // One button per upstream identity provider trex federates to. None on a
    // trex-only installation, so the page is then exactly the password form.
    fetch(TREX_BASE + "/settings")
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (settings) {
        // externalProviders() tolerates any shape here by design (a missing
        // or malformed `external` object just yields no buttons), so a
        // contract change on trex's side would otherwise fail silently: the
        // page would just render as a bare password form with nothing in
        // the console to explain why. Warn without changing behaviour.
        if (!settings || typeof settings.external !== "object" || settings.external === null) {
          console.warn("[d2e-login] unexpected /trex/auth/v1/settings shape; no federated providers will show:", settings);
        }
        // With one way in and nothing to type, the page is only a click in
        // the way: go straight to the provider. The loop guard stops a
        // provider that keeps sending the browser back here without an error
        // from turning into an endless redirect; the page then shows as usual.
        var params = new URLSearchParams(location.search);
        var autoId = P.autoRedirectProvider(settings, {
          error: params.get("error"),
          manual: params.has("manual"),
        });
        if (autoId && !recentlyRedirected()) {
          markRedirected();
          errorEl.textContent = "Redirecting to sign-in…";
          location.replace(P.authorizeHref(autoId, returnTo));
          return;
        }
        var providers = P.externalProviders(settings);
        providers.forEach(function (p) {
          var a = document.createElement("a");
          a.className = "provider";
          a.href = P.authorizeHref(p.id, returnTo);
          a.textContent = "Sign in with " + p.label;
          providersEl.appendChild(a);
        });
        // A federated installation turns native sign-in off: its users have
        // no trex password, so the form could only ever fail for them. trex
        // refuses the grant too; hiding the form removes the dead end.
        var passwordEnabled = P.passwordLoginEnabled(settings);
        form.hidden = !passwordEnabled;
        dividerEl.hidden = providers.length === 0 || !passwordEnabled;
        if (!passwordEnabled && providers.length === 0) {
          errorEl.textContent = "No sign-in method is available. Ask your administrator.";
        }
      })
      .catch(function () { /* the password form still works */ });
  }

  var REDIRECT_TS_KEY = "d2e_login_auto_redirect_ts";
  var REDIRECT_GUARD_MS = 10000;

  // sessionStorage can be missing or throw (private modes, blocked storage).
  // Without it there is no loop guard, so fail towards showing the page.
  function recentlyRedirected() {
    try {
      var last = parseInt(sessionStorage.getItem(REDIRECT_TS_KEY) || "0", 10);
      return Date.now() - last < REDIRECT_GUARD_MS;
    } catch (e) {
      return true;
    }
  }

  function markRedirected() {
    try { sessionStorage.setItem(REDIRECT_TS_KEY, String(Date.now())); } catch (e) { /* see above */ }
  }

  function showError(message) {
    errorEl.textContent = message;
    submitEl.disabled = false;
    submitEl.textContent = "Sign in";
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    errorEl.textContent = "";

    var identifier = identifierEl.value.trim();
    // trex authenticates by email. d2e identifies people by username, and a
    // trex account's email is the user's Logto email, or else their username
    // qualified with the configured domain (see accountEmail in
    // migration/plan.ts) — so resolve a bare username the same way rather
    // than making people type an address they never chose.
    var email = identifier.indexOf("@") === -1
      ? identifier + "@" + (window.D2E_LOGIN_DEFAULT_DOMAIN || "d2e.local")
      : identifier;
    var password = passwordEl.value;
    if (!identifier || !password) {
      showError("Enter your username and password.");
      return;
    }

    submitEl.disabled = true;
    submitEl.textContent = "Signing in…";

    fetch(TREX_BASE + "/token?grant_type=password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password }),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) {
            // A suspended account is told so: the person cannot fix it by
            // retrying, and leaving them with "incorrect password" sends them
            // to reset a password that was never wrong.
            if (body.error === "user_banned") {
              throw new Error("This account is suspended.");
            }
            // Otherwise deliberately not distinguishing unknown account from
            // wrong password: that difference tells an attacker which emails
            // exist.
            throw new Error(
              res.status === 400 || res.status === 401
                ? "Incorrect username or password."
                : body.error_description || body.error || "Sign-in failed. Please try again."
            );
          }
          if (!body.access_token) throw new Error("Sign-in failed. Please try again.");
          return body.access_token;
        });
      })
      .then(function (accessToken) {
        // The cookie is what /authorize reads; the token alone would leave the
        // browser signed in only as far as this page.
        return fetch(TREX_BASE + "/sync-cookie", {
          method: "POST",
          headers: { Authorization: "Bearer " + accessToken },
        }).then(function (res) {
          if (!res.ok) throw new Error("Could not start the session. Please try again.");
        });
      })
      .then(function () {
        location.replace(returnTo);
      })
      .catch(function (err) {
        showError(err && err.message ? err.message : "Sign-in failed. Please try again.");
      });
  });
})();
