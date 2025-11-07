sap.ui.define(
  ["jquery.sap.global", "sap/ui/core/mvc/Controller"],
  function (jQuery, Controller) {
    "use strict";

    var AppController = Controller.extend(
      "hc.hph.config.global.ui.views.App"
    );

    /**
     * Handle Nav Back Button.
     * Navigate back to the previous app.
     */

    return AppController;
  }
);
