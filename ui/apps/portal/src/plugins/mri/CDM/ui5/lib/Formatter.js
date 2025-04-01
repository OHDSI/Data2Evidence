sap.ui.define([
    "hc/hph/cdw/config/ui/lib/ConfigUtils"
], function (ConfigUtils) {
    "use strict";

// Declaration of the module. Will ensure that the containing namespace 'hc.hph.cdw.config.ui.lib' exists.

var Formatter = sap.ui.base.Object.extend("hc.hph.cdw.config.ui.lib.Formatter");
    /**
     * Formatter for the Config Name.
     * Adds "(Active)" after the config name to highlight active config.
     * @param   {String}  sName         Config Name
     * @param   {Boolean} bActive       True, if any version is active.
     * @param   {String}  sActiveString Translated string for "active"
     * @returns {String}  Name with added indicator.
     */
    /*
     BookmarkUtils.createFilterDescription = (function () {
         function createFilterDescription(filterObject) {
         }
         return createFilterDescription;
         })();
      */
    Formatter.configNameFormatter = (function () {
        function configNameFormatter(sName, bActive, sActiveString) {
        if (bActive) {
            sName += " (" + sActiveString + ")";
        }
        return sName;
        }
        return configNameFormatter;
    })();
    /**
     * Negates a given Boolean.
     * Useful if Buttons should be disabled if a certain condition is met.
     * @param   {Boolean} bActive Condition
     * @returns {Boolean} Negated Condition
     */
    Formatter.logicalNotFormatter = (function () {
        function logicalNotFormatter(bActive) {
            return !bActive;
        }
        return logicalNotFormatter;
    })();

    /**
     * Formatter for the expandable Panel header.
     * Returns a translated string depending on the expand status of the panel.
     * Additonally adds the number of versions to the string.
     * @param   {String}  sShowString    Translated string to be used if not expanded.
     * @param   {String}  sHideString    Translated string to be used if expanded.
     * @param   {Boolean} bPanelExpanded True if the panel is expanded.
     * @param   {Number}  iNumVersions   Number of versions.
     * @returns {String}  Combined string.
     */
    Formatter.configVersionPanelHeaderFormatter = (function () {
        function configVersionPanelHeaderFormatter(sShowString, sHideString, bPanelExpanded, iNumVersions) {
            var sText = bPanelExpanded ? sHideString : sShowString;
            return sText + " (" + iNumVersions + ")";
        }
        return configVersionPanelHeaderFormatter;
    })();

    /**
     * Formatter for the config version status.
     * Returns the correct translated status string choosen from the given choices.
     * Also conditionally adds a class to the source to highlight the status.
     * @param   {Boolean} bActive         True, if activated.
     * @param   {String}  sActiveString   Translated string to be used if true.
     * @param   {String}  sInactiveString Translated string to be used if false.
     * @returns {String}  Combined String.
     */
    Formatter.configVersionStatusFormatter = (function () {
        function configVersionStatusFormatter(bActive, sActiveString, sInactiveString, sDraftString) {
            switch(bActive){
                // case "A":
                case ConfigUtils.configStatusCode.ACTIVE:
                    this.addStyleClass("sapMxConfigOverviewTextItemStatus");
                    return sActiveString;
                // case "I":
                case ConfigUtils.configStatusCode.INACTIVE:
                    this.removeStyleClass("sapMxConfigOverviewTextItemStatus");
                    return sInactiveString;
                // case "D":
                case ConfigUtils.configStatusCode.DRAFT:
                    this.removeStyleClass("sapMxConfigOverviewTextItemStatus");
                    return sDraftString;
                default:
                    this.removeStyleClass("sapMxConfigOverviewTextItemStatus");
                    return sInactiveString;
            }
        }
        return configVersionStatusFormatter;
    })();

    Formatter.configActivationFormatter = (function () {
        function configActivationFormatter(bActive){
            switch(bActive){
                case ConfigUtils.configStatusCode.ACTIVE:
                case ConfigUtils.configStatusCode.DRAFT:
                    return false;
                case ConfigUtils.configStatusCode.INACTIVE:
                    return true;
                default:
                    return false;
            }
        }
        return configActivationFormatter;
    })();


    Formatter.configVersionTitleFormatter = (function () {
        function configVersionTitleFormatter(configName, versionText) {
            return configName ? configName + " - " + versionText : "";
        }
        return configVersionTitleFormatter;
    })();

    Formatter.configVersionFormatter = (function () {
        function configVersionFormatter(configVersion, autoSaveText) {
            if(configVersion === "0"){
                return autoSaveText;
            } else {
                return configVersion;
            }
        }
        return configVersionFormatter;
    })();


    return Formatter;
});
