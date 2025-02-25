sap.ui.define([
    "jquery.sap.global",
    "sap/ui/base/Object"
], function (jQuery, Object) {
    "use strict";

    /**
     * Constructor for a Patient Summary TabExtensionBase.
     * @constructor
     *
     * @classdesc
     * @abstract
     * Provides an abstract base for a tab extensions.
     * @extends sap.ui.base.Object
     * @alias sap.hc.hph.patient.app.ui.content.extension.TabExtensionBase
     */
    var TabExtensionBase = Object.extend("sap.hc.hph.patient.app.ui.content.extension.TabExtensionBase", {
        metadata: {
            publicMethods: [
                "getContent",
                "getText"
            ],
            abstract: true
        }
    });

    /**
     * Get the Controls to be added to the new tab.
     * @abstract
     * @returns {sap.ui.core.Control[]} Controls to be added to the new tab
     */
    TabExtensionBase.prototype.getContent = function () {
        throw new Error("getContent must be implemented in subclass");
    };

    /**
     * Get the (translated) Text for the new tab.
     * @abstract
     * @returns {string} Text for the new tab
     */
    TabExtensionBase.prototype.getText = function () {
        throw new Error("getText must be implemented in subclass");
    };

    return TabExtensionBase;
});
