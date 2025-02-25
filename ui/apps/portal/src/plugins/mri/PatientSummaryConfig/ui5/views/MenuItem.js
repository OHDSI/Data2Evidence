sap.ui.define(["sap/ui/unified/MenuItem"], function (UnifiedMenuItem) {
  "use strict";

  /**
   * Constructor for the MenuItem Controller.
   * @constructor
   *
   * @classdesc
   * MenuItem
   * @extends sap.ui.core.mvc.Controller
   * @alias hc.hph.patient.config.ui.views.MenuItem
   */
  var MenuItem = UnifiedMenuItem.extend("hc.hph.patient.config.ui.views.MenuItem", {
    metadata: {
      properties: {
        key: {
          type: "string",
        },
      },
    },
  });
  MenuItem.prototype.getPlaceholder = function () {
    if (!this.getText()) {
      return "";
    }
    return "{" + this.getKey() + "}";
  };

  /**
   * Initialize the Controller.
   * @protected
   * @override
   */
  return MenuItem;
});
