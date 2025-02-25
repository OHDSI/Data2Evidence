sap.ui.define([
    "jquery.sap.global",
    "sap/hc/hph/patient/app/ui/Utils",
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
     * @alias sap.hc.hph.patient.app.ui.view.Main
     */
    var MainController = Controller.extend("hc.hph.patient.app.ui.view.Main");
    /**
     * Initialize the Controller.
     * Attach listener to TargetDisplayed event.
     * Add config selection action button.
     * @override
     * @protected
     */
    MainController.prototype.onInit = function () {
        this.getView().setModel(new JSONModel({
            dataLoaded: false,
            appWidthLimited: true,
            settings: {
                tab: "timeline",
                showHeader: true
            }
        }));
        var that = this;
        var oSettingsButton = new Button({
            icon: "sap-icon://action-settings",
            text: Utils.getText("HPH_PAT_APP_SELECT_CONFIG"),
            press: function () {
                that._getContentComponent().openConfigSelectionDialog();
            }
        });
        this.getOwnerComponent().addActionButton(oSettingsButton);
        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.getTargets().getTarget("main").attachDisplay(this._onTargetDisplay, this);
        this.getView().addStyleClass(Utils.getContentDensityClass());
        this.mEventHandler = {
            beforeDataLoad: this._onBeforeDataLoad,
            afterDataLoad: this._onAfterDataLoad,
            configSelectionFailed: this._onConfigSelectionFailed,
            patientNotFound: this._onPatientNotFound,
            tabChange: this._onTabChange,
            navigationTargetChange: this._onNavigationTargetChange
        };
    };
    /**
     * Handle Target Displayed Event.
     * Set the patientId and tab from the url into the Model which is then bound to the content-component.
     * @private
     * @param {sap.ui.base.Event} oEvent Target Display Event
     */
    MainController.prototype._onTargetDisplay = function (oEvent) {
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
    MainController.prototype.onAfterRendering = function () {
        this.attachComponentEvents();
    };
    /**
     * Handler for the exit event.
     * Detaches from the Patient Summary Component events.
     * @override
     * @protected
     */
    MainController.prototype.onExit = function () {
        this.detachComponentEvents();
    };
    /**
     * Attach to the Patient Summary Component events.
     */
    MainController.prototype.attachComponentEvents = function () {
        var oPSComponent = this._getContentComponent();
        Object.keys(this.mEventHandler).forEach(function (sEventName) {
            oPSComponent.attachEvent(sEventName, this.mEventHandler[sEventName], this);
        }, this);
    };
    /**
     * Detach from the Patient Summary Component events.
     */
    MainController.prototype.detachComponentEvents = function () {
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
    MainController.prototype._onBeforeDataLoad = function () {
        this.getView().getModel().setProperty("/dataLoaded", false);
    };
    /**
     * Handler for the afterDataLoad event.
     * Set the model property "dataLoaded" to true.
     * @private
     */
    MainController.prototype._onAfterDataLoad = function () {
        this.getView().getModel().setProperty("/dataLoaded", true);
    };
    /**
     * Handler for the configSelectionFailed event.
     * Let the component handle the navigation to the previous page.
     * @private
     */
    MainController.prototype._onConfigSelectionFailed = function () {
        this.getOwnerComponent().navigateBack();
    };
    /**
     * Handler for the patientNotFound event.
     * Navigate to the PatientNotFound view.
     * @private
     * @param {sap.ui.base.Event} oEvent      Event with parameter "patientId"
     */
    MainController.prototype._onPatientNotFound = function (oEvent) {
        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        var mData = {patientId: oEvent.getParameter("patientId")};
        oRouter.navTo("wrongId", mData, true);
    };
    /**
     * Handler for the tabChange event.
     * Update the tab and trigger an URL update
     * @private
     * @param {sap.ui.base.Event} oEvent      Event with parameter "tab"
     */
    MainController.prototype._onTabChange = function (oEvent) {
        var sTab = oEvent.getParameter("tab");
        var oModel = this.getView().getModel();
        var oContext = oModel.getContext("/settings");
        oModel.setProperty("tab", sTab, oContext);
        this._updateURL();
    };
    /**
     * Handler for the navigationTargetChange event.
     * Update the navigation target and trigger an URL update
     * @private
     * @param {sap.ui.base.Event} oEvent      Event with parameters "navTarget" and "value"
     */
    MainController.prototype._onNavigationTargetChange = function (oEvent) {
        var sNavTarget = oEvent.getParameter("navTarget");
        var vValue = oEvent.getParameter("value");
        var oModel = this.getView().getModel();
        var oContext = oModel.getContext("/settings");
        oModel.setProperty("navTargets/" + sNavTarget, vValue, oContext);
        this._updateURL();
    };
    /**
     * Navigate the router to the new tab without setting a history entry.
     */
    MainController.prototype._updateURL = function () {
        var oModel = this.getView().getModel();
        var oContext = oModel.getContext("/settings");
        var mParams = {
            patientId: oModel.getProperty("patientId", oContext),
            tab: oModel.getProperty("tab", oContext),
            query: {}
        };
        var mNavTargets = oModel.getProperty("navTargets", oContext);
        Object.keys(mNavTargets).forEach(function (sNavTarget) {
            var sEncodedValue = encodeURIComponent(mNavTargets[sNavTarget]);
            if (sEncodedValue) {
                mParams.query[sNavTarget] = encodeURIComponent(mNavTargets[sNavTarget]);
            }
        });
        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.navTo("main", mParams, true);
    };
    /**
     * Handle Nav Back Button.
     * Navigate back to the previous app.
     */
    MainController.prototype.handleNavButtonPress = function () {
        this.getOwnerComponent().navigateBack();
    };
    /**
     * Handle fullscreen Button press.
     * Toogle fullscreen mode on the parent shell.
     */
    MainController.prototype.onFullScreenPress = function () {
        // The first css class is used when the UI is used alone, the second one when used from a fiori launch pad
        var sStyleClass = "sapUShellApplicationContainerLimitedWidth";
        var s128LaunchPad = "shellPage-PatientComponent-show";
        var s152LaunchPad = "application-PatientComponent-show";
        var bAppWidthLimited = !this.getView().getModel().getProperty("/appWidthLimited");

        // Select correct app container
        var oApplicationContainer = sap.ui.getCore().byId(s152LaunchPad);
        if (!oApplicationContainer) {
            oApplicationContainer = sap.ui.getCore().byId(s128LaunchPad);
        }

        // Check if setAppWidthLimited is available
        if (typeof oApplicationContainer.setAppWidthLimited === "function") {
            oApplicationContainer.setAppWidthLimited(bAppWidthLimited);
        } else {
            oApplicationContainer.$().toggleClass(sStyleClass);
        }
        // Update model
        this.getView().getModel().setProperty("/appWidthLimited", bAppWidthLimited);
    };
    /**
     * Handle Save as Tile button.
     * Creates new tile to the current patient.
     */
    MainController.prototype.handleSaveAsTilePressed = function () {
        var oI18nModel = this.getView().getModel("i18n");
        var sPatientId = this.getView().getModel().getProperty("/settings/patientId");
        var sTileTitle = this._getContentComponent().getTitle();
        if (!sTileTitle) {
            jQuery.sap.log.error("Patient Summary Header is empty. Using PatientId for Tile title instead");
            sTileTitle = sPatientId;
        }
        sap.ushell.Container.getService("Bookmark").addBookmark({
            title: sTileTitle,
            subtitle: oI18nModel.getResourceBundle().getText("HPH_PAT_APP_TITLE"),
            url: "#PatientComponent-show&/patient/" + sPatientId,
            icon: "sap-icon://wounds-doc"
        }).done(function () {
            Utils.notifyUser(sap.ui.core.MessageType.Success, "HPH_PAT_ADDING_TILE_SUCCESS");
        }).fail(function (sErrorMessage) {
            Utils.notifyUser(sap.ui.core.MessageType.Error, sErrorMessage);
        });
    };
    /**
     * Handle Reset to Defaults button.
     * Resets all customized timeline settings.
     */
    MainController.prototype.handleResetSettings = function () {
        if (this._getContentComponent()) {
            this._getContentComponent().resetSettings();
        }
    };
    /**
     * Get the internal content component of the Patient Summary.
     * @private
     * @returns {hc.hph.patient.app.ui.ui.content.Component} Content component.
     */
    MainController.prototype._getContentComponent = function () {
        return this.byId("contentContainer").getComponentInstance();
    };
    return MainController;
});
