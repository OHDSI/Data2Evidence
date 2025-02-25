sap.ui.define([
    "jquery.sap.global",
    "hc/hph/core/ui/JSONBinding/DeepJSONPropertyBinding",
    "hc/hph/patient/app/ui/lib/PatientData",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (jQuery, DeepJSONPropertyBinding, PatientData, Controller, JSONModel) {
    "use strict";

    /**
     * Constructor for a TabBaseController.
     * @constructor
     *
     * @classdesc
     * This Controller can be used as base class for the controller of a tab extension's root control.
     * It is responsible for patient data processing and has handlers for all actions of the tabs of the Patient Summary.
     *
     * @extends sap.ui.core.mvc.Controller
     * @alias sap.hc.hph.patient.app.ui.lib.tab.TabBaseController
     */
    var TabBaseController = Controller.extend("hc.hph.patient.app.ui.lib.tab.TabBaseController", {
        metadata: {
            properties: {
                userState: {
                    type: "object"
                }
            },
            events: {
                /**
                 * Notifies listeners that user-state-relevant changes have been made on this tab.
                 */
                userStateChanged: {
                    parameters: {}
                }
            }
        }
    });

    TabBaseController.prototype.getPatientModel = function () {
        return this.getView().getModel();
    };

    TabBaseController.prototype.setPatientModel = function (mPatientData) {
        var oPatientDataModel = new JSONModel(mPatientData);
        oPatientDataModel.setSizeLimit(Infinity);
        this.getView().setModel(oPatientDataModel);
    };

    // to check whether patient data processing is needed
    TabBaseController.prototype.hasPatientData = function () {
        return typeof this.getPatientModel() !== "undefined";
    };

    // process raw patient and config data and update model accordingly
    TabBaseController.prototype.processPatientData = function (mPatient, mConfig, mUserState) {
        if (mConfig) {
            var mConfigCopy = JSON.parse(JSON.stringify(mConfig));
            var that = this;
            this.setPatientModel(mConfigCopy);

            var aCallbackNames = ["startDataProcessing", "startLane", "finishLane", "addEntry", "startInteractionType", "finishInteractionType", "finishDataProcessing"];
            var mCallbacks = aCallbackNames.reduce(function (mPrevCallbacks, sCallbackName) {
                if (typeof that[sCallbackName] === "function") {
                    mPrevCallbacks[sCallbackName] = that[sCallbackName].bind(that);
                }
                return mPrevCallbacks;
            }, {});

            this.applyUserState(mUserState);

            if (mPatient && mPatient.interactionTypes) {
                // get config from tab
                var mTabData = this.getPatientModel().getData();

                // Process the patient master data
                mTabData.masterdata = PatientData.processMasterData(mPatient.masterData, mTabData.masterdata);

                // process patient data for tab
                PatientData.process(mPatient, mTabData, mCallbacks);

                // set processed patient data for tab
                this.setPatientModel(mTabData);
            }
        }
    };

    /**
     * Initialize the Controller.
     * @override
     */
    TabBaseController.prototype.onInit = function () {
        /* empty base class implementation */
    };

    /**
     * This function is called when the window is resized.
     * @override
     */
    TabBaseController.prototype.onResize = function () {
        /* empty base class implementation */
    };

    /**
     * This function is called before the whole processing starts.
     * @param {any} mConfig Patient Summary configuration
     * @override
     */
    TabBaseController.prototype.startDataProcessing = function (/* mConfig */) {
        /* empty base class implementation */
    };

    /**
     * This function is called before processing a lane.
     * @param {any} mLane Lane object.
     * @override
     */
    TabBaseController.prototype.startLane = function (/* mLane */) {
        /* empty base class implementation */
    };

    /**
     * This function is called before processing an interaction type of a lane.
     * @param {any} mInteractionType Interaction type object
     * @param {any} mLane Lane object
     * @override
     */
    TabBaseController.prototype.startInteractionType = function (/* mInteractionType, mLane */) {
        /* empty base class implementation */
    };

    /**
     * This function is called for each interaction.
     * @param {any} mEntry Interaction object
     * @param {any} mInteractionType Interaction type object
     * @param {any} mLane Lane object
     * @override
     */
    TabBaseController.prototype.addEntry = function (/* mEntry, mInteractionType, mLane */) {
        /* empty base class implementation */
    };

    /**
     * This function is called after processing an interaction type of a lane.
     * @param {any} mInteractionType Interaction type object
     * @param {any} mLane Lane object
     * @override
     */
    TabBaseController.prototype.finishInteractionType = function (/* mInteractionType, mLane */) {
        /* empty base class implementation */
    };

    /**
     * This function is called after a lane has been processed
     * @param {any} mLane Lane object
     * @override
     */
    TabBaseController.prototype.finishLane = function (/* mLane */) {
        /* empty base class implementation */
    };

    /**
     * This function is called after the whole processing is done
     * @param {any} mConfig PS config object
     * @override
     */
    TabBaseController.prototype.finishDataProcessing = function (/* mConfig */) {
        /* empty base class implementation */
    };

    /**
     * This function is called to reset all settings (e.g. the user state) to their defaults.
     * @override
     */
    TabBaseController.prototype.resetSettings = function () {
        /* empty base class implementation */
    };

    /**
     * Call this function when the user state has changed.
     */
    TabBaseController.prototype.markUserStateChanged = function () {
        this.fireEvent("userStateChanged");
    };

    /**
     * This function is called to retrieve the user state.
     * @returns {object} An object that represents the user state. This object will be passed as mUserState to processPatientData()
     * @override
     */
    TabBaseController.prototype.getUserState = function () {
        /* empty base class implementation */
        return {};
    };

    /**
     * This function is called before destruction of this extension.
     * @override
     */
    TabBaseController.prototype.onExit = function () {
        /* empty base class implementation */
    };

    /**
     * This function is called in processPatientData() to modify the original PS config object according to custom settings given in user state object
     * @param {any} mUserState User state to apply
     * @override
     */
    TabBaseController.prototype.applyUserState = function (/* mUserState */) {
        /* empty base class implementation */
    };

    TabBaseController.prototype.setUserState = function (mUserState) {
        this.applyUserState(mUserState);
    };

    return TabBaseController;
});

