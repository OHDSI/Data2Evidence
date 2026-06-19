/*
 * Atlas3 header-logo -> d2e portal (injected into index.html). Atlas3's
 * logoNavigateTo only does internal Vue-router navigation, so a capture-phase
 * click interceptor sends the logo to the external /d2e/portal instead.
 */
(function () {
  "use strict";
  var TARGET = "/d2e/portal";
  document.addEventListener("click", function (e) {
    var t = e.target;
    var logo = t && t.closest ? t.closest(".nav-bar__logo") : null;
    if (logo) {
      e.preventDefault();
      e.stopImmediatePropagation();
      window.location.href = TARGET;
    }
  }, true); // capture phase: run before Atlas3's router handler
})();
