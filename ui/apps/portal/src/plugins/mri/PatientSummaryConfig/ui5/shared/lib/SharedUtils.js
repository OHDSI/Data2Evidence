sap.ui.define([
    "jquery.sap.global",
    "hc/hph/core/ui/FioriUtils",
    "hc/hph/core/ui/ScopedUtils"
], function (jQuery, FioriUtils, ScopedUtils) {
    "use strict";

    /**
     * @namespace
     * @classdesc Utility class for Patient Summary Shared contents.
     * @extends hc.hph.core.ui.ScopedUtils
     * @alias hc.hph.patient.shared
     */
    var Utils = new ScopedUtils("hc.hph.patient.shared", [FioriUtils.DensityClass.Compact]);

    return Utils;
}, true);
