sap.ui.define([
    "sap/ui/core/library"
], function () {
    "use strict";

    sap.ui.getCore().setThemeRoot("sap_bluecrystal", ["hc.mri.pa.config.ui.lib"], "");

    /**
     * SAPUI5 library for MRI PA Configuration.
     *
     * @namespace
     * @name hc.mri.pa.config.ui.lib
     */
    sap.ui.getCore().initLibrary({
        name: "hc.mri.pa.config.ui.lib",
        version: "1.0.0",
        dependencies: [
            "sap.ui.core"
        ],
        types: [],
        interfaces: [],
        controls: [
            "hc.mri.pa.config.ui.lib.ConfigUtils",
            "hc.mri.pa.config.ui.lib.Formatter"
        ],
        elements: []
    });

    return hc.mri.pa.config.ui.lib;
});
