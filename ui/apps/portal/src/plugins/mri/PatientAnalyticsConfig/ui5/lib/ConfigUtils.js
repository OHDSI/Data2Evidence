sap.ui.define([
    "jquery.sap.global",
    "hc/hph/core/ui/ScopedUtils"
], function (jQuery, ScopedUtils) {
    "use strict";

    /**
     * @namespace
     * @classdesc Utility class for MRI PA config.
     * @extends hc.hph.core.ui.ScopedUtils
     * @alias hc.mri.pa.config.ui.lib.ConfigUtils
     */
    var ConfigUtils = new ScopedUtils("mri.pa.config");

    ConfigUtils.configEvents = {
        CONFIG_ANALYTICS_CHANGED: "CONFIG_ANALYTICS_CHANGED",
        CONFIG_ANALYTICS_DELETED: "CONFIG_ANALYTICS_DELETED",
        CONFIG_ANALYTICS_UPDATE_FINISHED: "CONFIG_ANALYTICS_UPDATE_FINISHED",
        CONFIG_ANALYTICS_WAS_IMPORTED: "CONFIG_ANALYTICS_WAS_IMPORTED",
        CONFIG_ANALYTICS_VERSION_LIST_UPDATED: "CONFIG_ANALYTICS_VERSION_LIST_UPDATED",
        CONFIG_ANALYTICS_CREATED: "CONFIG_ANALYTICS_CREATED",
        CONFIG_ANALYTICS_CREATED_VIA_IMPORT: "CONFIG_ANALYTICS_CREATED_VIA_IMPORT"
    };

    /**
     * Notifies the user using either a (modal) MessageBox or a MessageToast.
     * The method of notification depends on the level of the message.
     * For "warning" and "error" a MessageBox is opened, to prevent any user from missing it.
     * For any other kind of notification (e.g. "success" or "info"),
     * the MessageToast provides an non-interruptive notification.
     * @override
     * @param {sap.ui.core.MessageType} sLevel           Notification level, decides the method of notification
     * @param {String}                  sMessageKey      Key for the translation of the message, or message itself
     * @param {String}                  [sDetailMessage] Already translated part of the Message, added to the Message
     */
    ConfigUtils.notifyUser = function (sLevel, sMessageKey, sDetailMessage) {
        var sMessage = ConfigUtils.getText(sMessageKey);
        if (sDetailMessage) {
            sMessage += ": " + sDetailMessage;
        }
        ScopedUtils.prototype.notifyUser.call(this, sLevel, sMessage);
    };

    /**
     * Get the active version of a given data model configuration.
     * @private
     * @param   {object} versions Data model configuration versions
     * @returns {string} Version string.
     */
    ConfigUtils.getActiveVersion = function (versions) {
        for (var i in versions) {
            if (versions[i].status.toLowerCase() === "a") {
                return versions[i].version;
            }
        }
        return "";
    };

    /**
     * Get the latest version of a given data model configuration.
     * @private
     * @param   {object} versions Data model configuration versions
     * @returns {string} Version string.
     */
    ConfigUtils.getLatestVersion = function (versions) {
        var latest = -1;
        var version;
        for (var i in versions) {
            version = parseInt(versions[i].version, 10);
            if (!isNaN(version) && version > latest) {
                latest = version;
            }
        }
        return latest;
    };

    /**
     * Get the active or latest version of a given data model configuration.
     * @private
     * @param   {object} versions Data model configuration versions
     * @returns {string} Version string.
     */
    ConfigUtils.getActiveOrLatestVersion = function (versions) {
        var activeVersion = ConfigUtils.getActiveVersion(versions);
        var latestVersion = ConfigUtils.getLatestVersion(versions);

        if (activeVersion !== "") {
            return activeVersion;
        }
        if (latestVersion > -1) {
            return latestVersion;
        }

        return "";
    };

    /**
     * @typedef {Object} FrontEndProperties
     * @property {boolean} [isSaved=false] True if this config been saved
     * @property {boolean} [isModified=false] True if this config been modified
     * @property {boolean} [isValid=null] True/False if this config is valid/invalid; Null if unknown.
     * @property {number} [originalHash=null] Hash of the stored config; Null if unknown.
     * @property {object} patientlistorder Patientlist order store
     * @property {array} patientlistorder.columns Order of the columns in the patientlist
     * @property {array} errors Validation errors
     * @property {array} warnings Validation warnings
     */

    /**
     * Get the frontend properties.
     * @param   {boolean} isSaved Whether the configuration has been saved
     * @param   {object} [oConfig]  The MRI configuration
     * @returns {FrontEndProperties}  Object of frontend properties.
     */
    ConfigUtils.getFrontEndPropertiesObject = function (isSaved, oConfig) {
        return {
            isSaved: isSaved || false,
            isModified: false,
            isValid: isSaved || null,
            originalHash: oConfig ? this.hashJSON(oConfig) : null,
            patientlistorder: {
                columns: []
            },
            errors: [],
            warnings: []
        };
    };
    return ConfigUtils;
}, true);
