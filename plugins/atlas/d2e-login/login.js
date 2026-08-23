/*
 * D2E sign-in page.
 *
 * trex's OIDC provider hosts no login UI: when /authorize finds no session it
 * sends the browser here with a return_to. This page authenticates against
 * trex's native IdP, has trex set its session cookie, and returns to that URL,
 * where /authorize now finds a session and issues the authorization code.
 *
 * Plain ES, served as static files — the same shape as the other static pages
 * under /atlas, so it needs no build step.
 */
(function () {
  "use strict";

  var TREX_BASE = "/trex/auth/v1";
  var FALLBACK_RETURN = "/atlas/";

  var form = document.getElementById("form");
  var emailEl = document.getElementById("email");
  var passwordEl = document.getElementById("password");
  var submitEl = document.getElementById("submit");
  var errorEl = document.getElementById("error");

  /**
   * Only same-origin paths are honoured. return_to arrives in the query string,
   * so an absolute URL here would let anyone turn this page into an open
   * redirect by linking to it.
   */
  function safeReturnTo(raw) {
    if (!raw) return FALLBACK_RETURN;
    try {
      var url = new URL(raw, location.origin);
      if (url.origin !== location.origin) return FALLBACK_RETURN;
      return url.pathname + url.search + url.hash;
    } catch (e) {
      return FALLBACK_RETURN;
    }
  }

  var returnTo = safeReturnTo(new URLSearchParams(location.search).get("return_to"));

  function showError(message) {
    errorEl.textContent = message;
    submitEl.disabled = false;
    submitEl.textContent = "Sign in";
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    errorEl.textContent = "";

    var email = emailEl.value.trim();
    var password = passwordEl.value;
    if (!email || !password) {
      showError("Enter your email and password.");
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
            // Deliberately not distinguishing unknown account from wrong
            // password: that difference tells an attacker which emails exist.
            throw new Error(
              res.status === 400 || res.status === 401
                ? "Incorrect email or password."
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
