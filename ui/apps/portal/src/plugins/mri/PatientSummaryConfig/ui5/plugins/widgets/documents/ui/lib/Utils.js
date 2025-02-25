sap.ui.define([
    "jquery.sap.global",
    "hc/hph/core/ui/FioriUtils",
    "hc/hph/core/ui/ScopedUtils"
], function (jQuery, FioriUtils, ScopedUtils) {
    "use strict";

    /**
     * @namespace
     * @classdesc Utility class for Patient Summary Documents Widget extension.
     * @extends hc.hph.core.ui.ScopedUtils
     * @alias hc.hph.patient.plugins.widgets.documents
     */
    var Utils = new ScopedUtils("hc.hph.patient.plugins.widgets.documents", [FioriUtils.DensityClass.Compact]);

    return Utils;
}, true);
