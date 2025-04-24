sap.ui.define(["hc/mri/pa/config/ui/lib/ConfigUtils"],
    function (ConfigUtils) {
    "use strict";

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
     * @returns {boolean} True, if the warning should be visible.
     */
    Formatter.warningVisFormatter = function (sSelectedVersion, mVersions) {
        var bVisible = false;
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
            bVisible = sActiveVersion && sActiveVersion !== sSelectedVersion;
        }

        return bVisible;
    };

    Formatter.hideInitialControls = function (sModelName) {
        return sModelName !== "MRI_PA_SERVICES_FILTERCARD_TITLE_BASIC_DATA";
    };

    Formatter.interactionTextHeader = function (sModelName, attributes) {
        var interactionName = sModelName;
        if (sModelName === "MRI_PA_SERVICES_FILTERCARD_TITLE_BASIC_DATA") {
            interactionName = ConfigUtils.getText(sModelName);
        } 
        return interactionName + " (" + attributes.length + ")";
    };

    Formatter.interactionDropdown = function (sModelName) {
        var interactionName = sModelName;
        if (sModelName === "MRI_PA_SERVICES_FILTERCARD_TITLE_BASIC_DATA") {
            interactionName = ConfigUtils.getText(sModelName);
        }
        return interactionName;
    };

    return Formatter;
});
