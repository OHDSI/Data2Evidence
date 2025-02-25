sap.ui.define([
    "jquery.sap.global",
    "hc/hph/core/ui/FioriUtils",
    "hc/hph/core/ui/ScopedUtils"
], function (jQuery, FioriUtils, ScopedUtils) {
    "use strict";

    /**
     * @namespace
     * @classdesc Utility class for Patient Summary Risks Widget extension.
     * @extends hc.hph.core.ui.ScopedUtils
     * @alias hc.hph.patient.plugins.widgets.risks
     */
    var Utils = new ScopedUtils("hc.hph.patient.plugins.widgets.risks", [FioriUtils.DensityClass.Compact]);

    return Utils;
}, true);
