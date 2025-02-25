sap.ui.define([
    "jquery.sap.global",
    "sap/hc/hph/core/ui/FioriUtils",
    "sap/hc/hph/core/ui/ScopedUtils"
], function (jQuery, FioriUtils, ScopedUtils) {
    "use strict";

    /**
     * @namespace
     * @classdesc Utility class for Patient Summary Risks Widget extension.
     * @extends sap.hc.hph.core.ui.ScopedUtils
     * @alias sap.hc.hph.patient.plugins.widgets.risks
     */
    var Utils = new ScopedUtils("sap.hc.hph.patient.plugins.widgets.risks", [FioriUtils.DensityClass.Compact]);

    return Utils;
}, true);
