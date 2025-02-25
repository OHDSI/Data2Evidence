sap.ui.define([
    "jquery.sap.global"
], function () {
    "use strict";

    /**
     * Formatter for application specific texts.
     * @namespace
     * @alias hc.hph.patient.config.ui.lib.Formatter
     */
    var Formatter = {};

    /**
     * Formatter for the Version text.
     * @param   {number} iVersion      Version number
     * @param   {string} sStatus       One char status, A or I
     * @param   {string} sActiveString Translated string for the active status
     * @returns {string} Combined translated string.
     */
    Formatter.versionTextFormatter = function (iVersion, sStatus, sActiveString) {
        if (sStatus === "A") {
            iVersion += " - " + sActiveString;
        }
        return iVersion;
    };

    /**
     * Formatter that defines if the warning message (informing the user that a different cdw config is active) should
     * be visible or not.
     * @param   {string}  sSelectedVersion Selected version
     * @param   {object}  mVersions        Object of versions
     * @param   {string}  sSelectedPI Selected PI version
     * @returns {boolean} True, if the warning should be visible.
     */
    Formatter.WarningVisFormatter = function (sSelectedVersion, mVersions, sSelectedPI) {
        var visible = false;
        var sActiveVersion;

        if (typeof sSelectedVersion !== "undefined" && typeof mVersions !== "undefined") {
            for (var i = 0; i < Object.keys(mVersions).length; i++) {
                var sKey = Object.keys(mVersions)[i];
                if (mVersions.hasOwnProperty(sKey)) {
                    if (mVersions[sKey].status === "A") {
                        sActiveVersion = mVersions[sKey].version;
                    }
                }
            }

            if (sActiveVersion && sSelectedVersion && sActiveVersion !== sSelectedVersion && sSelectedPI) {
                visible = true;
            }
        }

        return visible;
    };

    return Formatter;
});
