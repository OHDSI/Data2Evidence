sap.ui.define([
    "jquery.sap.global",
    "hc/hph/core/ui/ScopedUtils",
    "sap/m/MessageToast"
], function (jQuery, ScopedUtils, MessageToast) {
    "use strict";

    /**
     * Utils modules for the Config related (static) functionality
     * @namespace
     * @alias hc.hph.cdw.config.ui.lib.ConfigUtils
     */
    var ConfigUtils = new ScopedUtils("hph.cdw.config");

    ConfigUtils.models = {
        CONFIG_OVERVIEW: "configOverviewModel",
        CONFIG_EDITOR: "configEditorModel",
        CONFIG_GENERAL: "configGeneralModel"
    };

    ConfigUtils.IteratorLevel = {
        INTERACTION: 0,
        ATTRIBUTE: 1
    };

    ConfigUtils.configEvents = {
        EVENT_CONFIG_FILTER_CARD_CHANGED: "CONFIG_FILTER_CARD_CHANGED",
        EVENT_CONFIG_ATTRIBUTE_CHANGED: "CONFIG_ATTRIBUTE_CHANGED",
        EVENT_CONFIG_ADD_ELEM: "CONFIG_ADD_ELEM",
        EVENT_CONFIG_REMOVE_ELEM: "CONFIG_REMOVE_ELEM",
        EVENT_CONFIG_ADD_ATTRIBUTE: "CONFIG_ADD_ATTRIBUTE",
        EVENT_CONFIG_ADD_FILTER_CARD: "CONFIG_ADD_FILTER_CARD",
        EVENT_CONFIG_ACCEPT_ELEM: "EVENT_CONFIG_ACCEPT_ELEM",
        EVENT_CONFIG_DUPLICATE_ELEM: "EVENT_CONFIG_DUPLICATE_ELEM",
        EVENT_CONFIG_DUPLICATE_ELEM_FROM_OTHER: "EVENT_CONFIG_DUPLICATE_ELEM_FROM_OTHER",
        EVENT_CONFIG_ADD_CONDITION: "EVENT_CONFIG_ADD_CONDITION",
        EVENT_TEST_ATTR: "EVENT_TEST_ATTR",
        EVENT_CONFIG_REORDER_ARRAY: "EVENT_CONFIG_REORDER_ARRAY",
        EVENT_CONFIG_HIDE_ATTRIBUTE: "EVENT_CONFIG_HIDE_ATTRIBUTE",
        EVENT_CONFIG_HIDE_FC: "EVENT_CONFIG_HIDE_FC",
        EVENT_CONFIG_CREATE_CONFIG: "EVENT_CONFIG_CREATE_CONFIG",
        EVENT_CONFIG_IMPORT_CONFIG: "EVENT_CONFIG_IMPORT_CONFIG",
        EVENT_CONFIG_DUPLICATE_CONFIG: "EVENT_CONFIG_DUPLICATE_CONFIG",
        EVENT_CONFIG_SELECTED_CONFIG_VERSION: "EVENT_CONFIG_SELECTED_CONFIG_VERSION",
        EVENT_CONFIG_NAVIGATE_BACK: "EVENT_CONFIG_NAVIGATE_BACK",
        EVENT_CONFIG_REQUEST_CONFIG_ACTIVATION: "EVENT_CONFIG_REQUEST_CONFIG_ACTIVATION",
        EVENT_CONFIG_REQUEST_CONFIG_SAVE_AND_ACTIVATION: "EVENT_CONFIG_REQUEST_CONFIG_SAVE_AND_ACTIVATION",
        EVENT_CONFIG_ACTIVATED_CONFIG: "EVENT_CONFIG_ACTIVATED_CONFIG",
        EVENT_CONFIG_DELETED_CONFIG: "EVENT_CONFIG_DELETED_CONFIG",
        EVENT_CONFIG_REQUEST_CONFIG_SAVE: "EVENT_CONFIG_REQUEST_CONFIG_SAVE",
        EVENT_CONFIG_SAVED_CONFIG: "EVENT_CONFIG_SAVED_CONFIG",
        EVENT_CONFIG_CONFIG_CHANGED: "EVENT_CONFIG_CONFIG_CHANGED",
        EVENT_CONFIG_DELETE_CONFIG_VERSION_PRESSED: "EVENT_CONFIG_DELETE_CONFIG_VERSION_PRESSED",
        EVENT_CONFIG_DELETE_CONFIG_PRESSED: "EVENT_CONFIG_DELETE_CONFIG_PRESSED",
        EVENT_CONFIG_DELETE_MULTIPLE_CONFIG_PRESSED: "EVENT_CONFIG_DELETE_MULTIPLE_CONFIG_PRESSED",
        EVENT_CONFIG_VALIDATION_CONFIG_VALID: "EVENT_CONFIG_VALIDATION_CONFIG_VALID",
        EVENT_CONFIG_VALIDATION_CONFIG_WITH_ERRORS: "EVENT_CONFIG_VALIDATION_CONFIG_WITH_ERRORS",
        EVENT_CONFIG_REQUEST_VALIDATION: "EVENT_CONFIG_REQUEST_VALIDATION",
        EVENT_CONFIG_REQUEST_QUERY_CHECK: "EVENT_CONFIG_REQUEST_QUERY_CHECK",
        EVENT_CONFIG_OTS_ACTIVATION: "EVENT_CONFIG_OTS_ACTIVATION",
        EVENT_CONFIG_AUTO_VALIDATION_AND_SAVE: "EVENT_CONFIG_AUTO_VALIDATION_AND_SAVE",
        EVENT_CONFIG_SWITCH_LAYOUT: "EVENT_CONFIG_SWITCH_LAYOUT",
        EVENT_TEMPLATE_LOAD: "EVENT_TEMPLATE_LOAD",
        EVENT_CONFIG_GENERATE_SUGGESTION: "EVENT_CONFIG_GENERATE_SUGGESTION",
        EVENT_CONFIG_ID_VALIDATION: "EVENT_CONFIG_ID_VALIDATION",
        EVENT_CONFIG_UPDATE_PARENT_INTERACTION: "CONFIG_UPDATE_PARENT_INTERACTION",
        EVENT_CONFIG_ADD_ANNOTATION_ATTRIBUTE: "EVENT_CONFIG_ADD_ANNOTATION_ATTRIBUTE",
        EVENT_CONFIG_DELETE_ANNOTATION_ATTRIBUTE: "EVENT_CONFIG_DELETE_ANNOTATION_ATTRIBUTE",
        EVENT_CONFIG_PAGE_BUSY: "EVENT_CONFIG_PAGE_BUSY",
        EVENT_CONFIG_LOAD_SUGGESTION: "EVENT_CONFIG_LOAD_SUGGESTION",
        EVENT_CONFIG_FILTERCARD_CHANGE_PLACEHOLDER: "EVENT_CONFIG_FILTERCARD_CHANGE_PLACEHOLDER"
    };

    ConfigUtils.configStatusCode = {
        ACTIVE: "A",
        INACTIVE: "I",
        DRAFT: "D"
    };

    ConfigUtils.createToast = function (text) {
        MessageToast.show(this.getText(text));
    };

    ConfigUtils.createAlertDialog = function (title, text, suffix) {
        suffix = suffix || "";
        var message = new sap.m.Text({
            text: this.getText(text) + suffix
        });
        sap.m.MessageBox
                .alert(message, null, this.getText(title));
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
     * Validates the name for a new config.
     * The name has to be
     * - not empty
     * - longer than 2 characters
     * - not used by another config.
     * If any condition is violated, the input will be set to error state and an appropriate value state text will be
     * added. Otherwise the status will be set to success.
     * @param {string}   sNewName         New configuration name
     * @param {Object[]} aConfigurations  List of existing configurations
     * @param {boolean}  bAllowDuplicated Flag, whether to allow ducplicates
     * @param {function} callback         Callback with status and validity information
     */
    ConfigUtils.isNewConfigNameValid = function (sNewName, aConfigurations, bAllowDuplicated, callback) {
        var sValueStateTextKey;
        if (!sNewName) {
            sValueStateTextKey = "HPH_CDM_CFG_OVERVIEW_ADD_CONFIG_TITLE_NOT_EMPTY";
        } else if (sNewName.length < 3) {
            sValueStateTextKey = "HPH_CDM_CFG_OVERVIEW_NAME_TOO_SHORT";
        } else if (!bAllowDuplicated) {
            var bDuplicate = aConfigurations.some(function (oConfig) {
                return oConfig.name === sNewName;
            });
            if (bDuplicate) {
                sValueStateTextKey = "HPH_CDM_CFG_OVERVIEW_NAME_EXISTS";
            }
        }
        var isValid = true;
        var sValueStateText = "";
        if (sValueStateTextKey) {
            sValueStateText = this.getText(sValueStateTextKey);
            isValid = false;
        }

        callback(isValid, sValueStateText);
    };

    ConfigUtils.log = function (sLevel, sMessage, sDetails) {
        if (!ConfigUtils.logger) {
            ConfigUtils.logger = jQuery.sap.log.getLogger("HPH CDW Config");
        }
        ConfigUtils.logger[sLevel](sMessage, sDetails);
    };

    ConfigUtils.logDebug = function (sMessage, sDetails) {
        ConfigUtils.log("debug", sMessage, sDetails);
    };

    ConfigUtils.logError = function (sMessage, sDetails) {
        ConfigUtils.log("error", sMessage, sDetails);
    };

    ConfigUtils.logError = function (sMessage, sDetails) {
        ConfigUtils.log("error", sMessage, sDetails);
    };

    /**
     * 
     * @param {JSON} input - object to search and run fnDo 
     * @param {function} fnFind - search function to execute. arguments are current object key and json object  
     * @param {function} fnDo - functio to run. arguments are current object key and json object
     */
    ConfigUtils.JSONFindAndDo = function (input, fnFind, fnDo) {
        if (!input) {
            return;
        }

        var keyList = Object.keys(input);

        for (var i = 0; i < keyList.length; i++) {
            var key = keyList[i];
            if (typeof input[key] === "undefined") {
                return;
            }
            if (fnFind(input, key)) {
                fnDo(input, key);
            } else if (input[key] instanceof Array) {
                for (var index = 0; index < input[key].length; index++) {
                    ConfigUtils.JSONFindAndDo(input[key][index], fnFind, fnDo);
                }
            } else if (typeof input[key] === "object" && Object.keys(input[key]).length > 0) {
                ConfigUtils.JSONFindAndDo(input[key], fnFind, fnDo);
            }
        }
    };

    return ConfigUtils;
});
