sap.ui.define([
    "jquery.sap.global",
    "hc/hph/core/ui/JSONBinding/DeepJSONPropertyBinding",
    "hc/hph/patient/app/ui/lib/PatientData",
    "hc/hph/patient/app/ui/lib/tab/TabBaseController",
    "hc/hph/patient/app/ui/lib/TileAnnotation",
    "hc/hph/patient/app/ui/lib/utils/Utils",
    "hc/hph/patient/plugins/tabs/overview/ui/lib/UserStateOverview",
    "sap/ui/model/Filter"
], function (jQuery, DeepJSONPropertyBinding, PatientData, TabBaseController, TileAnnotation, Utils, UserStateOverview, Filter) {
    "use strict";

    /**
     * Constructor for the Patient Summary Overview Controller.
     * @constructor
     *
     * @classdesc
     * This Controller is responsible for loading the patient data and handling all actions on the tabs of the Patient Summary.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.hph.patient.app.ui.content.view.Content
     */
    var OverviewController = TabBaseController.extend("hc.hph.patient.plugins.tabs.overview.ui.view.Overview");

    /** @constant {string[]} Properties of overview lanes/bins that are relevant for user state */
    OverviewController.USER_STATE_OVERVIEW_BOUND_PROPERTIES = ["initiallyFiltered"];

    OverviewController.prototype.setPatientModel = function (mPatientData) {
        // call parent implementation
        TabBaseController.prototype.setPatientModel.call(this, mPatientData);
        this.filterOverviewInteractions();
        this._registerModelBindings();
    };

    // to check whether patient data processing is needed
    OverviewController.prototype.hasPatientData = function () {
        return TabBaseController.prototype.hasPatientData.call(this)
            && this.getPatientModel().getProperty("processed");
    };

    OverviewController.prototype.getUserState = function () {
        var aLanes = this.getPatientModel().getProperty("/lanes");
        return UserStateOverview.getUserStateFromLanes(aLanes);
    };

    OverviewController.prototype.applyUserState = function (mUserState) {
        var aLanes = this.getPatientModel().getProperty("/lanes");
        UserStateOverview.applyUserStateToLanes(mUserState, aLanes);
        this.getPatientModel().updateBindings();
    };

    /**
     * Initialize the Controller.
     * On initialization, the masterdata ObjectHeader and the Overview don't have any data yet, so they are set busy.
     * Once the patient config has been loaded in the component the actual data can be loaded.
     * @override
     * @protected
     */
    OverviewController.prototype.onInit = function () {
        TabBaseController.prototype.onInit.call(this);
    };

    /**
     * TODO: function duplicate for both overview and timeline tab
     *
     * Attaches a change handler for all given user state-relevant properties to all lanes in the given model.
     *
     * @private
     * @param {object} oModel The model with lanes.
     * @param {string[]} aPropertiesToBind The properties of a lane that should be used for attaching a change handler.
     */
    OverviewController.prototype._attachUserStateChangeHandlerToLanes = function (oModel, aPropertiesToBind) {
        // detach first to avoid double binding
        if (typeof this._aUserStatePropertyBindings !== "undefined") {
            this._aUserStatePropertyBindings.forEach(function (oPropertyBinding) {
                oPropertyBinding.detachChange(this.markUserStateChanged, this);
            }, this);
        }
        this._aUserStatePropertyBindings = [];

        oModel.getData().lanes.forEach(function (oLane, nIndex) {
            var oLaneContext = oModel.getContext("/lanes/" + nIndex);
            aPropertiesToBind.forEach(function (sProperty) {
                var oPropertyBinding = new DeepJSONPropertyBinding(oModel, sProperty, oLaneContext);
                this._aUserStatePropertyBindings.push(oPropertyBinding);
                oPropertyBinding.attachChange(this.markUserStateChanged, this);
            }, this);
        }, this);
    };

    /**
     * Register model bindings to be notified about changes that are relevant for user state.
     * @private
     */
    OverviewController.prototype._registerModelBindings = function () {
        // bind user state relevant properties to overview categories
        this._attachUserStateChangeHandlerToLanes(this.getPatientModel(), OverviewController.USER_STATE_OVERVIEW_BOUND_PROPERTIES);
    };

    OverviewController.prototype.startDataProcessing = function (mResult) {
        // Add overview specific properties to result data set
        jQuery.extend(true, mResult, {
            overviewInteractions: {
                dated: [],
                undated: []
            }
        });

        // initialize temporary storage for interactions, used during data processing
        this._datedInteractions = [];
        this._undatedInteractions = [];
    };

    OverviewController.prototype.startLane = function (mInteractionBin) {
        // initialize lane's dated/undated interactions counts
        mInteractionBin.datedCount = 0;
        mInteractionBin.undatedCount = 0;
    };

    OverviewController.prototype.addEntry = function (mEntry, mInteractionType, mInteractionBin) {
        var mOverviewEntry = {
            name: mInteractionType.name,
            groupName: mInteractionBin.title,
            color: mInteractionBin.color,
            start: mEntry.start,
            end: mEntry.end,
            annotations: mEntry.annotations,
            attributes: PatientData.getTileAttributes(mEntry)
        };

        // Group timeline and overview entries in dated/dateless interactions
        // Assumes that the backend return entries that have either NEITHER start nor end OR BOTH
        if (PatientData._hasFullDateInfo(mEntry)) {
            mInteractionBin.datedCount += 1;
            this._datedInteractions.push(mOverviewEntry);
        } else {
            mInteractionBin.undatedCount += 1;
            this._undatedInteractions.push(mOverviewEntry);
        }
    };

    // This function is called after a lane has been processed
    OverviewController.prototype.finishLane = function (mInteractionBin) {
        // compute lane's total number of interactions
        mInteractionBin.totalCount = mInteractionBin.datedCount + mInteractionBin.undatedCount;
    };

    // This function is called after all lanes have been processed
    OverviewController.prototype.finishDataProcessing = function (mResult) {
        Array.prototype.push.apply(mResult.overviewInteractions.dated, this._datedInteractions);
        Array.prototype.push.apply(mResult.overviewInteractions.undated, this._undatedInteractions);
        this._datedInteractions = [];
        this._undatedInteractions = [];

        mResult.processed = true;
    };

    /**
     * Returns a template text rendered with the total number of dated interactions
     * @param {any} sText Text with interaction count placeholder
     * @param {any} aLanes Array of all lanes in the model
     * @returns {number} Text where the placeholder replaced by the total number of dated interactions
     */
    OverviewController.prototype.formatDatedTextAndCount = function (sText, aLanes) {
        var nLength = 0;
        if (Array.isArray(aLanes)) {
            nLength = aLanes.reduce(function (count, mLane) {
                return mLane.initiallyFiltered && mLane.datedCount ? count + mLane.datedCount : count;
            }, 0);
        }
        return jQuery.sap.formatMessage(sText, [nLength]);
    };

    /**
     * Returns a template text rendered with the total number of undated interactions
     * @param {any} sText Text with interaction count placeholder
     * @param {any} aLanes Array of all lanes in the model
     * @returns {number} Text where the placeholder replaced by the total number of undated interactions
     */
    OverviewController.prototype.formatUndatedTextAndCount = function (sText, aLanes) {
        var nLength = 0;
        if (Array.isArray(aLanes)) {
            nLength = aLanes.reduce(function (count, mLane) {
                return mLane.initiallyFiltered && mLane.undatedCount ? count + mLane.undatedCount : count;
            }, 0);
        }
        return jQuery.sap.formatMessage(sText, [nLength]);
    };

    /**
     * Fixme: function duplicate for both overview and timeline tab
     *
     * Factory function to create TileAnnotations.
     * Creates TileAnnotations and adds Controls from extensions.
     * @private
     * @param   {string}               sId          Id of the new control
     * @param   {sap.ui.model.Context} oContext     BindingContext of the control
     * @param   {string}               sFunction    Name of the function to get the extension controls
     * @param   {object}               oTabControl  Tab control where extension Controls may bound themselves as dependency
     * @returns {hc.hph.patient.app.ui.lib.TileAnnotation} New TileAnnotation control.
     */
    OverviewController.prototype._createAnnotations = function (sId, oContext, sFunction, oTabControl) {
        var sAnnotation = oContext.getProperty("annotation");
        var aValues = oContext.getProperty("values");
        return new TileAnnotation(sId, {
            name: sAnnotation,
            values: aValues,
            controls: this.getOwnerComponent().getExtensions(sAnnotation).reduce(function (aControls, mExtension) {
                var aExtensionControls;
                try {
                    aExtensionControls = mExtension.controller[sFunction](sAnnotation, aValues, oTabControl);
                } catch (oError) {
                    jQuery.sap.log.error("Patient Summary Extension \"" + mExtension.id + "\" threw an exception on " + sFunction + ": " + oError.message);
                }
                if (aExtensionControls && Array.isArray(aExtensionControls)) {
                    aExtensionControls.forEach(function (oControl) {
                        if (oControl instanceof sap.ui.core.Control) {
                            aControls.push(oControl);
                        }
                    });
                }
                return aControls;
            }, [])
        });
    };

    /**
     * Factory function to create TileAnnotations for the Overview.
     * Creates TileAnnotations and adds Controls from extensions.
     * @private
     * @param   {string}               sId       Id of the new control
     * @param   {sap.ui.model.Context} oContext  BindingContext of the control
     * @returns {hc.hph.patient.app.ui.lib.TileAnnotation} New TileAnnotation control.
     */
    OverviewController.prototype.createOverviewAnnotations = function (sId, oContext) {
        return this._createAnnotations(sId, oContext, "getOverviewControls", this.getView());
    };

    /**
     * Filters the overview interactions.
     * The visible interactions are defined by the OverviewButtons and the config.
     */
    OverviewController.prototype.filterOverviewInteractions = function () {
        var aFilters = [];
        var mLanes = this.getPatientModel().getProperty("/lanes");
        if (!mLanes) {
            return;
        }
        mLanes.forEach(function (mLane) {
            if (!mLane.initiallyFiltered) {
                aFilters.push(new Filter({
                    path: "groupName",
                    operator: sap.ui.model.FilterOperator.NE,
                    value1: mLane.title
                }));
            }
        });
        ["overviewListUndated", "overviewListDated"].forEach(function (sId) {
            var oList = this.getView().byId(sId);
            if (oList) {
                var oListBinding = oList.getBinding("items");
                if (aFilters.length) {
                    oListBinding.filter(new Filter({
                        filters: aFilters,
                        and: true
                    }), sap.ui.model.FilterType.Application);
                } else {
                    oListBinding.filter();
                }
            }
        }, this);
        ["overviewPanelUndated", "overviewPanelDated"].forEach(function (sId) {
            var oPanel = this.getView().byId(sId);
            if (oPanel) {
                oPanel.getBinding("headerText").refresh(true);
            }
        }, this);
    };

    OverviewController.prototype.resetSettings = function () {
        var oOverviewModel = this.getPatientModel();
        var aLanes = oOverviewModel.getProperty("/lanes");
        aLanes.forEach(function (oLane) {
            oLane.initiallyFiltered = oLane.datedCount + oLane.undatedCount > 0;
        });
        oOverviewModel.updateBindings();
        this.filterOverviewInteractions();
    };

    return OverviewController;
});

