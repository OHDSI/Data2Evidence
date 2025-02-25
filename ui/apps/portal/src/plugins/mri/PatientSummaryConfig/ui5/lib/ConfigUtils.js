sap.ui.define([
    "jquery.sap.global",
    "hc/hph/core/ui/ScopedUtils"
], function (jQuery, ScopedUtils) {
    "use strict";

    /**
     * @namespace
     * @classdesc Utility class for the FFH Patient Summary configuration.
     * @extends hc.hph.core.ui.ScopedUtils
     * @alias hc.hph.patient.config.ui.lib.ConfigUtils
     */
    var ConfigUtils = new ScopedUtils("hph.patient.config");

    ConfigUtils.configEvents = {
        CONFIG_ANALYTICS_CHANGED: "CONFIG_ANALYTICS_CHANGED",
        CONFIG_ANALYTICS_DELETED: "CONFIG_ANALYTICS_DELETED",
        CONFIG_ANALYTICS_UPDATE_FINISHED: "CONFIG_ANALYTICS_UPDATE_FINISHED",
        CONFIG_ANALYTICS_WAS_IMPORTED: "CONFIG_ANALYTICS_WAS_IMPORTED",
        CONFIG_ANALYTICS_VERSION_LIST_UPDATED: "CONFIG_ANALYTICS_VERSION_LIST_UPDATED"
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
    * Generate a unique ID (UID).
    * @returns {string} UID string
    */
    ConfigUtils.createGuid = function () {
        // The fixed digit '4' indicates that this GUID was generated using random numbers
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            var v = c === "x" ? r : r & 0x3 | 0x8;
            return v.toString(16);
        });
    };

    /**
     * The function does a very basic high level check to catch user errors caused by importing
     * the wrong kind of json file (e.g. cdm config).
     * I.e. checks for the three mandatory top-level properties of the configuration.
     * @param  {object}  mConfig ps configuration object (admin format)
     * @returns {Boolean}         validity
     */
    ConfigUtils.isValidConfig = function (mConfig) {
        var mandatoryKeys = [
            "lanes",
            "inspectorOptions",
            "masterdata"
        ];
        if (typeof mConfig !== "object") {
            return false;
        }
        return mandatoryKeys.every(hasOwnProperty, mConfig);
    };

    return ConfigUtils;
}, true);
