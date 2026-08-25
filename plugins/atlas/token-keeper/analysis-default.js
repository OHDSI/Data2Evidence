(function () {
  'use strict'

  var wizardHash = '#/analysis/x/wizards/wizards'

  function isAnalysisHash(hash) {
    return hash === '#/analysis' || hash.indexOf('#/analysis/') === 0
  }

  function isBuiltInDefaultHash(hash) {
    return hash === '#/analysis' || hash === '#/analysis/' || hash === '#/analysis/feature-analyses'
  }

  document.addEventListener('click', function (event) {
    if (isAnalysisHash(window.location.hash) || !(event.target instanceof Element)) return

    // nav-bar__nav-link is owned by Atlas. Wait for its asynchronous redirect,
    // then replace only the built-in Analysis default with the Wizard route.
    if (!event.target.closest('.nav-bar__nav-link')) return
    window.setTimeout(function () {
      if (isBuiltInDefaultHash(window.location.hash)) {
        window.location.replace(wizardHash)
      }
    }, 100)
  }, true)
})()
