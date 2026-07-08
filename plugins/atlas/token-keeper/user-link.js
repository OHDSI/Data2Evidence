/*
 * Atlas3 navbar user menu -> d2e portal account page (injected into index.html).
 * The `.nav-bar__user` activator normally opens an in-app dropdown (logout only);
 * a capture-phase click interceptor sends it to the d2e portal profile instead.
 */
(function () {
  "use strict";
  var TARGET = "/d2e/portal/researcher/account";
  document.addEventListener("click", function (e) {
    // Leave modified/non-primary clicks (open-in-new-tab gestures) alone.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target;
    var user = t && t.closest ? t.closest(".nav-bar__user") : null;
    if (user) {
      e.preventDefault();
      e.stopImmediatePropagation();
      window.location.href = TARGET;
    }
  }, true); // capture phase: run before Atlas3's dropdown handler
})();
