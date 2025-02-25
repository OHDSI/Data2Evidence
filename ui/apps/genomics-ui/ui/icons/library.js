sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/library"
], function () {
    "use strict";
    /**
         * SAPUI5 library for FfH genomics UI icons.
         *
         * @namespace
         * @name hc.hph.genomics.ui.icons
         */
    sap.ui.getCore().initLibrary({
        name: "hc.hph.genomics.ui.icons",
        version: "1.0.0",
        dependencies: ["sap.ui.core"],
        types: [],
        interfaces: [],
        controls: [],
        elements: ["hc.hph.genomics.ui.icons.sap-hc-hph-genomics-icons"]
    });
    return hc.hph.genomics.ui.icons;
});