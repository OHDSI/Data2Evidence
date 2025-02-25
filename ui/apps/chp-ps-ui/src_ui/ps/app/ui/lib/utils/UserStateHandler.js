sap.ui.define([], function () {
    "use strict";

    /**
     * @const{string} Identifier of the stored user states for CHP Patient Summary.
     */
    var LOCAL_STORAGE_KEY = "SAP_CHP_PS_USER_CONFIG";

    /**
     * Constructor for a new UserStateHandler.
     * @constructor
     * @param {string} [username] Overwrites username taken from FLP;
     *
     * @classdesc
     * UserStateHandler class
     * @alias sap.hc.hph.patient.app.ui.lib.utils.UserStateHandler
     */
    function UserStateHandler(username) {
        this.username = username || this.getUserName();
    }

    /**
     * Returns the current user name of the FLP
     * @returns {string} User Name
     */
    UserStateHandler.prototype.getUserName = function () {
        if (sap.ushell) {
            return sap.ushell.Container.getService("UserInfo").getUser().getFullName();
        } else {
            return "default";
        }
    };

    /**
     * Returns the state of the current user specific to this configuration
     * from the local storage of the browser.
     * @param {string} configId Patient Summary Configuration Id
     * @param {string} configVersion Patient Summary Configuration Version
     * @param {string} tabKey key for tab-specific user state
     * @returns {object} Stored state of the user for the configuration
     */
    UserStateHandler.prototype.getState = function (configId, configVersion, tabKey) {
        var savedStates = this._getSavedStates();

        var state = {};
        if (savedStates.hasOwnProperty(this.username)
                && savedStates[this.username].hasOwnProperty(configId)
                && savedStates[this.username][configId].hasOwnProperty(configVersion)
                && savedStates[this.username][configId][configVersion].hasOwnProperty(tabKey)) {
            state = savedStates[this.username][configId][configVersion][tabKey];
        }
        return state;
    };

    /**
     * Store the state of the current user specific to his configuration
     * in the local storage of the browser.
     * @param {string} configId Patient Summary Configuration Id
     * @param {string} configVersion Patient Summary Configuration Version
     * @param {string} tabKey key for tab-specific user state
     * @param {object} state Current State of the Session
     */
    UserStateHandler.prototype.setState = function (configId, configVersion, tabKey, state) {
        var currentStates = this._getSavedStates();

        if (!currentStates.hasOwnProperty(this.username)) {
            currentStates[this.username] = {};
        }
        if (!currentStates[this.username].hasOwnProperty(configId)) {
            currentStates[this.username][configId] = {};
        }
        if (!currentStates[this.username][configId].hasOwnProperty(configVersion)) {
            currentStates[this.username][configId][configVersion] = {};
        }
        currentStates[this.username][configId][configVersion][tabKey] = state;
        this._setStates(currentStates);
    };

    /**
     * Writes the states to the local storage
     * @private
     * @param {object} states Object including the states per user and configuration
     */
    UserStateHandler.prototype._setStates = function (states) {
        if (window.localStorage) {
            try {
                window.localStorage[LOCAL_STORAGE_KEY] = JSON.stringify(states);
            } catch (e) {
                jQuery.sap.log.error("Failed to write user settings to local Storage");
            }
        }
    };

    /**
     * Reads the states in the local storage
     * @private
     * @returns {object} Object including the states per user and configuration
     */
    UserStateHandler.prototype._getSavedStates = function () {
        var savedStates = {};
        if (window.localStorage && window.localStorage.hasOwnProperty(LOCAL_STORAGE_KEY)) {
            try {
                savedStates = JSON.parse(window.localStorage[LOCAL_STORAGE_KEY]);
            } catch (e) {
                jQuery.sap.log.error("Failed to load user settings from local Storage");
            }
        }
        return savedStates;
    };

    return UserStateHandler;
});
