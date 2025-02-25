sap.ui.define([
    "jquery.sap.global",
    "hc/hph/core/ui/FioriUtils",
    "hc/hph/core/ui/ScopedUtils"
], function (jQuery, FioriUtils, ScopedUtils) {
    "use strict";

    /**
     * @namespace
     * @classdesc Utility class for Patient Summary Masterdata Tab extension.
     * @extends hc.hph.core.ui.ScopedUtils
     * @alias hc.hph.patient.plugins.tabs.masterdata
     */
    var Utils = new ScopedUtils("hc.hph.patient.plugins.tabs.masterdata", [FioriUtils.DensityClass.Compact]);

    return Utils;
}, true);
