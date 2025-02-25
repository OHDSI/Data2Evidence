sap.ui.define([
    "jquery.sap.global",
    "hc/hph/patient/app/ui/Utils",
    "sap/m/Button",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (jQuery, Utils, Button, Controller, JSONModel) {
    "use strict";
    /**
     * Constructor for the Patient Summary app Main Controller.
     * @constructor
     *
     * @classdesc
     * This is the Controller for the content in the Patient Summary app.
     * It propagates settings from the app url to the content controller.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.hph.patient.app.ui.view.Main
     */
    var PatientSummaryController = Controller.extend("hc.hph.genomics.ui.lib.vb.site.PatientSummary");
    /**
     * Initialize the Controller.
     * Attach listener to TargetDisplayed event.
     * Add config selection action button.
     * @override
     * @protected
     */
    PatientSummaryController.prototype.onInit = function () {
        this.getView().setModel(new JSONModel({
            dataLoaded: false,
            appWidthLimited: true,
            settings: {
                tab: "timeline",
                showHeader: true
            }
        }));
        this.mEventHandler = {
            beforeDataLoad: this._onBeforeDataLoad,
            afterDataLoad: this._onAfterDataLoad,
            configSelectionFailed: this._onConfigSelectionFailed,
            patientNotFound: this._onPatientNotFound
        };
    };
    /**
     * Handle Target Displayed Event.
     * Set the patientId and tab from the url into the Model which is then bound to the content-component.
     * @private
     * @param {sap.ui.base.Event} oEvent Target Display Event
     */
    PatientSummaryController.prototype._onTargetDisplay = function (oEvent) {
        var mData = oEvent.getParameter("data");
        this.getView().getModel().setProperty("/settings/patientId", mData.patientId);
        var sTab = mData.tab || "";
        if (sTab) {
            this.getView().getModel().setProperty("/settings/tab", sTab);
        }
        var mNavTargets = mData["?query"] || {};
        Object.keys(mNavTargets).forEach(function (sNavTarget) {
            mNavTargets[sNavTarget] = decodeURIComponent(mNavTargets[sNavTarget]);
        });
        this.getView().getModel().setProperty("/settings/navTargets", mNavTargets);
    };
    /**
     * Handler for the afterRendering event.
     * Attaches to the Patient Summary Component events.
     * @override
     * @protected
     */
    PatientSummaryController.prototype.onAfterRendering = function () {
        this.attachComponentEvents();
    };
    /**
     * Handler for the exit event.
     * Detaches from the Patient Summary Component events.
     * @override
     * @protected
     */
    PatientSummaryController.prototype.onExit = function () {
        this.detachComponentEvents();
    };
    /**
     * Attach to the Patient Summary Component events.
     */
    PatientSummaryController.prototype.attachComponentEvents = function () {
        var oPSComponent = this._getContentComponent();
        Object.keys(this.mEventHandler).forEach(function (sEventName) {
            oPSComponent.attachEvent(sEventName, this.mEventHandler[sEventName], this);
        }, this);
    };
    /**
     * Detach from the Patient Summary Component events.
     */
    PatientSummaryController.prototype.detachComponentEvents = function () {
        var oPSComponent = this._getContentComponent();
        if (oPSComponent) {
            Object.keys(this.mEventHandler).forEach(function (sEventName) {
                oPSComponent.detachEvent(sEventName, this.mEventHandler[sEventName], this);
            }, this);
        }
    };
    /**
     * Handler for the beforeDataLoad event.
     * Set the model property "dataLoaded" to false.
     * @private
     */
    PatientSummaryController.prototype._onBeforeDataLoad = function () {
        this.getView().getModel().setProperty("/dataLoaded", false);
    };
    /**
     * Handler for the afterDataLoad event.
     * Set the model property "dataLoaded" to true.
     * @private
     */
    PatientSummaryController.prototype._onAfterDataLoad = function () {
        this.getView().getModel().setProperty("/dataLoaded", true);
    };
    /**
     * Handler for the configSelectionFailed event.
     * Let the component handle the navigation to the previous page.
     * @private
     */
    PatientSummaryController.prototype._onConfigSelectionFailed = function () {
        console.error("Config selection failed");
        this.getView().getContent()[0].close();
    };
    /**
     * Handler for the patientNotFound event.
     * Navigate to the PatientNotFound view.
     * @private
     * @param {sap.ui.base.Event} oEvent      Event with parameter "patientId"
     */
    PatientSummaryController.prototype._onPatientNotFound = function (oEvent) {
        console.error("Could not find patient " + oEvent.getParameter("patientId"));
        this.getView().getContent()[0].close();
    };
    /**
     * Handle Reset to Defaults button.
     * Resets all customized timeline settings.
     */
    PatientSummaryController.prototype.handleResetSettings = function () {
        if (this._getContentComponent()) {
            this._getContentComponent().resetSettings();
        }
    };
    /**
     * Get the internal content component of the Patient Summary.
     * @private
     * @returns {hc.hph.patient.app.ui.ui.content.Component} Content component.
     */
    PatientSummaryController.prototype._getContentComponent = function () {
        return this.getView().getContent()[0].getContent()[0].getComponentInstance();
    };
    PatientSummaryController.prototype.handleClose = function () {
        this.getView().getContent()[0].close();
        this._getContentComponent().setPatientId(null);
    };
    return PatientSummaryController;
});