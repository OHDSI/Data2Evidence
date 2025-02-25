sap.ui.define([
    "jquery.sap.global",
    "hc/hph/patient/app/ui/Utils",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (jQuery, Utils, Controller, JSONModel) {
    "use strict";
    /**
     * Constructor for the Patient Summary app NotFound Controller.
     * @constructor
     *
     * @classdesc
     * Controller for the NotFound views. Provides basic functionality for the Views.
     * @extends sap.ui.core.mvc.Controller
     * @alias sap.hc.hph.patient.app.ui.view.NotFound
     */
    var NotFoundController = Controller.extend("hc.hph.patient.app.ui.view.NotFound");
    /**
     * Initialize the Controller.
     * Attach listener to TargetDisplayed event.
     * @override
     * @protected
     */
    NotFoundController.prototype.onInit = function () {
        this.getView().setModel(new JSONModel({
            dataLoaded: false,
            appWidthLimited: true,
            settings: {
                tab: "timeline",
                showHeader: false
            }
        }));
        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.getTargets().getTarget("wrongId").attachDisplay(this._onTargetDisplay, this);
        this.getView().addStyleClass(Utils.getContentDensityClass());
    };
    /**
     * Handle Target Displayed Event.
     * Set the patientId into the Model.
     * @private
     * @param {sap.ui.base.Event} oEvent Target Display Event
     */
    NotFoundController.prototype._onTargetDisplay = function (oEvent) {
        this.getView().getModel().setProperty("/settings/patientId", oEvent.getParameter("data").patientId);
    };
    /**
     * Handle Nav Back Button.
     * Navigate back to the previous app.
     */
    NotFoundController.prototype.onNavButtonPress = function () {
        this.getOwnerComponent().navigateBack();
    };
    return NotFoundController;
});
