/*
 * Atlas3 browser tab -> d2e branding (injected into index.html).
 * Atlas3 sets document.title to "<page> | ATLAS" after every route change, from a
 * constant the theme config cannot override. The d2e title is set statically in
 * index.html by postinstall (along with the favicon); ignore Atlas3's writes so
 * it stays. Correcting the title after each write instead let "ATLAS" flash in
 * the tab on routes whose render delayed the correction.
 */
(function () {
  "use strict";
  var title = Object.getOwnPropertyDescriptor(Document.prototype, "title");
  Object.defineProperty(document, "title", {
    configurable: true,
    get: function () { return title.get.call(document); },
    set: function () {}
  });
})();
