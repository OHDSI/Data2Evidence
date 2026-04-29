sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/Control"
], function (jQuery, Control) {
    "use strict";

    var BoolItem = Control.extend("sap.hc.mri.pa.ui.lib.BoolItem", {
        metadata: {
            interfaces: [
                "sap.hc.mri.pa.ui.lib.IBoolItem"
            ]
        },
        renderer: {}
    });

    BoolItem.prototype.getIFR = function () {
        throw new Error("getIFR must be implemented by BoolItem subclass");
    };

    BoolItem.prototype.setFilterValues = function () {
        throw new Error("setFilterValues must be implemented by BoolItem subclass");
    };

    return BoolItem;
});
