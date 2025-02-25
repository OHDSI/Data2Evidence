sap.ui.define([
    "jquery.sap.global",
    "sap/hc/hph/core/ui/FioriUtils",
    "sap/hc/hph/core/ui/ScopedUtils"
], function (jQuery, FioriUtils, ScopedUtils) {
    "use strict";

    /**
     * @namespace
     * @classdesc Utility class for Patient Summary Overview Tab extension.
     * @extends sap.hc.hph.core.ui.ScopedUtils
     * @alias sap.hc.hph.patient.plugins.tabs.overview
     */
    var Utils = new ScopedUtils("hc.hph.patient.plugins.tabs.overview", [FioriUtils.DensityClass.Compact]);

    return Utils;
}, true);
