sap.ui.define([
    "jquery.sap.global",
    "hc/hph/patient/app/ui/lib/PatientData",
    "hc/hph/patient/app/ui/lib/tab/TabExtension",
    "hc/hph/patient/app/ui/lib/utils/Utils",
    "sap/ui/core/mvc/Controller"
], function (jQuery, PatientData, TabExtension, Utils, Controller) {
    "use strict";

    /**
     * Constructor for the Patient Summary Content Controller.
     * @constructor
     *
     * @classdesc
     * This Controller is responsible for loading the patient data and handling all actions on the tabs of the Patient Summary.
     * @extends sap.ui.core.mvc.Controller
     * @alias sap.hc.hph.patient.app.ui.content.view.Content
     */
    var ContentController = Controller.extend("hc.hph.patient.app.ui.content.view.Content");

    /** @constant {boolean} Time in ms used with timeout for saving user state */

    /**
     * Initialize the Controller.
     * On initialization, the masterdata ObjectHeader and the Timeline don't have any data yet, so they are set busy.
     * Once the patient config has been loaded in the component the actual data can be loaded.
     * @override
     * @protected
     */
    ContentController.prototype.onInit = function () {
        // TODO: _loadData() after configuration is selected
        // this._loadData();
        // Listen to contentComponent's reload event (not page reload).
        this.getOwnerComponent().attachReload(function (oEvent) {
            this._sPatientId = oEvent.getParameter("patientId");
            console.log(oEvent.getParameter("patientId"))
            var oStateModel = this.getView().getModel("state");
            oStateModel.setProperty("/busy", true);
            if (this.$PatientServicePromise) {
                this._cancelRequests();
            }

            this._loadData();
        }, this);
    };

    ContentController.prototype.onAfterRendering = function () {
        var oScrollContainer = this.byId("scrollContainer");
        // Listen to resize events
        sap.ui.core.ResizeHandler.deregister(oScrollContainer);
        sap.ui.core.ResizeHandler.register(oScrollContainer, ContentController.prototype.onResize.bind(this));
    };

    ContentController.prototype.formatterStretchContent = function (sKey, aExtensions) {
        if (Array.isArray(aExtensions) && sKey) {
            var aExtensionsFiltered = aExtensions.filter(function (mExtension) {
                return mExtension.config.key === sKey;
            });
            return aExtensionsFiltered.length === 1 && aExtensionsFiltered[0].config.stretchContent;
        }
    };

    /**
     * Cancels the patient service request.
     * @private
     */
    ContentController.prototype._cancelRequests = function () {
        this.$PatientServicePromise.reject("abort");
        delete this.$PatientServicePromise;
    };

    ContentController.prototype.getUserName = function () {
        if (sap.ushell) {
            return sap.ushell.Container.getService("UserInfo").getUser().getFullName();
        } else {
            return "default";
        }
    };

    /**
     * Load the patient data from the configured patient service.
     * The loading of the interactions is done in parallel.
     * The loaded patient data is processed into the required format and set into the model as soon as it arrives.
     * @private
     */
    ContentController.prototype._loadData = function () {
        this.getOwnerComponent().notifyDataLoadStarted();
        // TODO: after configuration is selected, model will be populated
        var oStateModel = this.getView().getModel("state");
        var oConfigModel = this.getView().getModel("config");
        var mConfig = oConfigModel.getData();
        var mConfigMetaData = this.getView().getModel("meta").getData();

        var aInteractionTypes = mConfig.lanes.reduce(function (aLaneInteractionTypes, mLane) {
            return aLaneInteractionTypes.concat(mLane.interactions.map(function (mInteraction) {
                return mInteraction.source;
            }));
        }, []).filter(function (sType, iIndex, aSelf) {
            return aSelf.indexOf(sType) === iIndex;
        });
        
        // Tried with Sample data, but got rendering issues for extensions components
        // TODO: Intergrate Patient Summary endpoint
        this.$PatientServicePromise = Utils.ajax({
            url: this.getOwnerComponent().getMetadata().getConfig().patientService,
            type: "POST",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify({
                patientId: this._sPatientId,
                configData: mConfigMetaData,
                interactionTypes: aInteractionTypes
            }),
            dataType: "json"
        }).done(function (mPatient) {
            oStateModel.setProperty("/error", "");

            // Check if the patient exists (or is visible to the user)
            if (!mPatient || (PatientData.getAttributeForAnnotation(mPatient.masterData, mConfig.masterdata, "patient_id") || "").toLowerCase() !== this._sPatientId.toLowerCase()) {
                this.getOwnerComponent().notifyPatientNotFound(this._sPatientId);
                return;
            }

            this.getView().getModel("patient").setData(mPatient);

            this.getOwnerComponent().notifyDataLoadFinished();
        }.bind(this)).fail(function ($jqXHR, sTextStatus, sErrorThrown) {
            if (sTextStatus !== "abort") {
                jQuery.sap.log.error("PatientService request failed", sErrorThrown, "@Timeline Content.controller");
            }
            // Go to the error page (by setting the error reason)
            var errorReasonMsg;
            if ($jqXHR && $jqXHR.responseJSON && $jqXHR.responseJSON.logId) {
                errorReasonMsg = Utils.getText("HPH_PAT_CONTENT_DB_LOGGED_MESSAGE", [$jqXHR.responseJSON.logId]);
            } else {
                errorReasonMsg = Utils.getText("HPH_PAT_CONTENT_SERVER_ERROR_RELDOC");
            }
            oStateModel.setProperty("/error", errorReasonMsg);
        }).always(function () {
            oStateModel.setProperty("/busy", false);
        });
    };

    ContentController.prototype._getSelectedTabComponent = function () {
        var oIconTabBar = this.byId("patientIconTabBar");
        var aFiltered = oIconTabBar.getItems().filter(function (oItem) {
            return oItem.getKey() === oIconTabBar.getSelectedKey();
        });
        if (aFiltered.length === 1 && aFiltered[0] instanceof TabExtension) {
            return aFiltered[0].getComponent();
        }
    };

    ContentController.prototype._getLoadedTabComponents = function () {
        var oIconTabBar = this.byId("patientIconTabBar");
        return oIconTabBar.getItems()
            .map(function (oItem) {
                return oItem instanceof TabExtension && oItem.getComponent();
            })
            .filter(function (oController) {
                return oController;
            });
    };

    ContentController.prototype.onResize = function (e) {
        var oTabComponent = this._getSelectedTabComponent();
        if (oTabComponent && typeof oTabComponent.onResize === "function") {
            oTabComponent.onResize(e);
        }
    };

    ContentController.prototype.formatterMinimizedIcon = function (bMinimized) {
        return bMinimized ? "" : "";
    };

    ContentController.prototype.toggleMinimized = function () {
        var oModel = this.getView().getModel("state");
        oModel.setProperty("/minimizedHeader", !oModel.getProperty("/minimizedHeader"));
    };

    ContentController.prototype.resetSettings = function () {
        this._getLoadedTabComponents().forEach(function (oTabComponent) {
            if (typeof oTabComponent.resetSettings === "function") {
                oTabComponent.resetSettings();
            }
        }, this);
        // todo: should we delete user state for all non-loaded tabs?
        this.getOwnerComponent().saveUserStates();
    };

    ContentController.prototype.onExit = function () {
        this.getOwnerComponent().saveUserStates();
    };

    return ContentController;
});
