sap.ui.define([
    "jquery.sap.global",
    "sap/hc/hph/core/ui/FioriUtils",
    "sap/hc/hph/core/ui/ScopedUtils"
], function (jQuery, FioriUtils, ScopedUtils) {
    "use strict";

    /**
     * @namespace
     * @classdesc Utility class for Patient Summary Timeline Tab extension.
     * @extends sap.hc.hph.core.ui.ScopedUtils
     * @alias sap.hc.hph.patient.plugins.tabs.timeline
     */
    var Utils = new ScopedUtils("hc.hph.patient.plugins.tabs.timeline", [FioriUtils.DensityClass.Compact]);

    return Utils;
}, true);
