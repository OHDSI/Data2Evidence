sap.ui.define([
    "sap/ui/core/Control",
    "sap/ui/core/mvc/View",
    "sap/ui/core/UIComponent",
    "./TabBaseController"
], function (Control, View, UIComponent, TabBaseController) {
    "use strict";

    /**
     * Constructor for a TabExtensionBaseComponent.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
	 * @class
	 * TabExtensionBaseComponent can be used as base class for tab extensions of version 1.1 (and later).
     * If an TabBaseController is used as controller of the component's root control, the corresponding data
     * processing functions (e.g. startProcessing, addEntry) are called automatically.
     *
     * Hint:
     * Version 1.1 tab extensions are not required to use a subclass of the TabExtensionBaseComponent.
     * They can also use a UIComponent directly with the following interface:
     *
     * Mandatory:
     *  - getText() function to return the tab header text
     *
     * Optional:
     *  - one or more of the properties of the TabExtensionBaseComponent, they will be two-way bound to the corresponding data
     *  - resetSettings() function which is called when the user resets the settings to defaults
     *
     * @extends sap.ui.core.UIComponent
     * @alias sap.hc.hph.patient.app.ui.lib.tab.TabExtensionBaseComponent
     */
    var TabExtensionBaseComponent = UIComponent.extend("hc.hph.patient.app.ui.lib.tab.TabExtensionBaseComponent", {
        metadata: {
            properties: {
                extensionConfig: {
                    type: "object"
                },
                config: {
                    type: "object"
                },
                meta: {
                    type: "object"
                },
                patientData: {
                    type: "object"
                },
                userState: {
                    type: "object"
                },
                urlParams: {
                    type: "object"
                }
            }
        }
    });

    /**
     * Get the (translated) Text for the new tab.
     * @returns {string} Text for the new tab
     */
    TabExtensionBaseComponent.prototype.getText = function () {
        return "unnamed";
    };

    TabExtensionBaseComponent.prototype.getController = function () {
        if (this.mAggregations.rootControl instanceof View) {
            var oTabController = this.mAggregations.rootControl.getController();
            if (oTabController instanceof TabBaseController) {
                return oTabController;
            }
        }
    };

    // Propagate user state changes upwards to the model
    TabExtensionBaseComponent.prototype._pullUserState = function (oEvent) {
        var oTabController = oEvent.getSource();
        var mUserState = oTabController.getUserState();
        this.setProperty("userState", mUserState, true);
    };

    TabExtensionBaseComponent.prototype.reprocessData = function () {
        // Check if extension is of "new" TabExtension format,
        // gives old extensions the possibility to function without patient config
        var oTabController = this.getController();
        if (oTabController) {
            // Detach previous user state listeners
            oTabController.detachEvent("userStateChanged", this._pullUserState, this);
            oTabController.processPatientData(this.getPatientData(), this.getConfig(), this.getUserState(), this.getExtensionConfig());
            // Listen to changes of the user state
            oTabController.attachEvent("userStateChanged", this._pullUserState, this);
        }
        var mPatientData = this.getPatientData();
        if (mPatientData && mPatientData.masterData && this.fireReload) {
            this.fireReload({
                patientId: mPatientData.masterData.attributes.pid
            });
        }
    };

    TabExtensionBaseComponent.prototype.setConfig = function (mConfig) {
        this.setProperty("config", mConfig, true);
        this.reprocessData();
    };

    TabExtensionBaseComponent.prototype.setPatientData = function (mPatientData) {
        this.setProperty("patientData", mPatientData, true);
        this.reprocessData();
    };

    TabExtensionBaseComponent.prototype.setUserState = function (mUserState) {
        this.setProperty("userState", mUserState, true);
        this.reprocessData();
    };

    TabExtensionBaseComponent.prototype.onResize = function () {
        var oController = this.getController();
        if (oController && typeof oController.onResize === "function") {
            oController.onResize.apply(this._extension, arguments);
        }
    };

    TabExtensionBaseComponent.prototype.resetSettings = function () {
        var oController = this.getController();
        if (oController && typeof oController.resetSettings === "function") {
            oController.resetSettings();
        }
    };

    TabExtensionBaseComponent.prototype.navToTab = function (sKey) {
        var mUrlParams = JSON.parse(JSON.stringify(this.getUrlParams() || {}));
        mUrlParams.tab = sKey;
        this.setProperty("urlParams", mUrlParams, true);
    };

    return TabExtensionBaseComponent;
});
