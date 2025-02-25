sap.ui.define([
    "jquery.sap.global",
    "sap/hc/hph/core/ui/FioriUtils",
    "sap/hc/hph/core/ui/ScopedUtils"
], function (jQuery, FioriUtils, ScopedUtils) {
    "use strict";

    /**
     * @namespace
     * @classdesc Utility class for Patient Summary Diagnoses Tab extension.
     * @extends sap.hc.hph.core.ui.ScopedUtils
     * @alias sap.hc.hph.patient.plugins.tabs.diagnoses
     */
    var Utils = new ScopedUtils("sap.hc.hph.patient.plugins.tabs.diagnoses", [FioriUtils.DensityClass.Compact]);

    return Utils;
}, true);
