sap.ui.define([
    "jquery.sap.global",
    "hc/hph/core/ui/DateUtils",
    "hc/hph/core/ui/FioriUtils",
    "hc/hph/core/ui/ScopedUtils",
    "./UserStateHandler"
], function (jQuery, DateUtils, FioriUtils, ScopedUtils, UserStateHandler) {
    "use strict";

    /**
     * @namespace
     * @classdesc Utility class for Patient Summary.
     * @extends sap.hc.hph.core.ui.ScopedUtils
     * @alias sap.hc.hph.patient.app.ui
     */
    var Utils = new ScopedUtils("sap.hc.hph.patient.app.ui", [FioriUtils.DensityClass.Compact]);

    var userStateHandler = new UserStateHandler();
    Utils.setState = userStateHandler.setState.bind(userStateHandler);
    Utils.getState = userStateHandler.getState.bind(userStateHandler);
    Utils.localToUtc = DateUtils.localToUtc;

    return Utils;
}, true);
