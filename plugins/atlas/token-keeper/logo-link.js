/*
 * Atlas3 logo -> d2e portal link (served at /atlas, injected into index.html).
 *
 * Atlas3's header logo is a <button class="nav-bar__logo"> that navigates via the
 * Vue router. Its `logoNavigateTo` config only does INTERNAL routing (the router
 * guard calls next(a)), so it can't point at an external path like /d2e/portal.
 * This capture-phase click interceptor catches the logo click before Atlas3's own
 * handler and does a full browser navigation back to the d2e portal instead.
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
