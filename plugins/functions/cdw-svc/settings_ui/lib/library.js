sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/library"
], function (jQuery) {
    "use strict";

    sap.ui.getCore().setThemeRoot("sap_bluecrystal", ["legacy.config.global.ui.lib"], "");

    /**
     * SAPUI5 library for Configurations Assignment.
     *
     * @namespace
     * @name legacy.config.assignment.ui.lib
     * @author SAP SE
     * @version 1.0.0
     * @public
     */
    sap.ui.getCore().initLibrary({
        name: "legacy.config.global.ui.lib",
        version: "1.0.0",
        dependencies: [
            "sap.ui.core",
            "sap.ui.commons"
        ],
        types: [
        ],
        interfaces: [
        ],
        controls: [
        ],
        elements: [
        ]
    });

    return legacy.config.global.ui.lib;
});
