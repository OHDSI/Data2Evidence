sap.ui.define([
    "sap/ui/core/Control"
], function (Control) {
    "use strict";

    /**
     * Constructor for a TabExtensionPlaceholder.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * This control acts as a helper for the a TabExtension to detect when the tab needs to be rendered the first time.
     * It will then be replaced by the Tab Components root control.
     *
     * @extends sap.ui.core.Control
     * @alias sap.hc.hph.patient.app.ui.lib.tab.TabExtensionPlaceholder
     */
    var TabExtensionPlaceholder = Control.extend("hc.hph.patient.app.ui.lib.tab.TabExtensionPlaceholder", {
        metadata: {
            library: "sap.hc.hph.patient.app.ui.lib"
        }
    });

    TabExtensionPlaceholder.prototype.onBeforeRendering = function () {
        this.getParent().showExtension();
    };

    return TabExtensionPlaceholder;
});
