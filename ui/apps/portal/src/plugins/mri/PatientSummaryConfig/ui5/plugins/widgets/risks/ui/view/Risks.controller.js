sap.ui.define([
    "hc/hph/patient/app/ui/lib/utils/Utils",
    "hc/hph/patient/app/ui/lib/PatientData",
    "hc/hph/patient/app/ui/lib/tab/WidgetBaseController"
], function (Utils, PatientData, WidgetBaseController) {
    "use strict";

    /**
     * Constructor for the Patient Summary Risks Controller.
     * @constructor
     *
     * @classdesc
     * This Controller is responsible for loading the patient data and handling all actions on the tabs of the Patient Summary.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.hph.patient.app.ui.content.view.Content
     */
    var RisksController = WidgetBaseController.extend("hc.hph.patient.plugins.widgets.risks.ui.view.Risks");

    var aAnnotations = [
        "ps_risk_class",
        "ps_risk_group",
        "ps_risk_advice",
        "ps_risk_text1",
        "ps_risk_text2",
        "interaction_start"
    ];

    /**
     * This function is called before the whole processing starts.
     * @param {any} mConfig Patient Summary configuration
     * @override
     */
    RisksController.prototype.startDataProcessing = function (/* mConfig */) {
        //
        // TARGET MODEL STRUCTURE
        // {
        //    entries: [],
        //    totalEntries: 0
        // }
        //
        // SINGLE RISK
        // {
        //     title: "AK Pflegerischer Dekurs Aufwachraum",
        //     date: new Date("2010-01-21")
        // }

        // initialize temporary storage for risks, used during data processing
        this._mEntries = [];
    };

    /**
     * This function is called before processing an interaction type of a lane.
     * @param {any} mInteractionType Interaction type object
     * @param {any} mLane Lane object
     * @override
     */
    RisksController.prototype.startInteractionType = function (mInteractionType /* , mLane */) {
        // Ignore interactions that have not all mandatory annotations
        return aAnnotations.every(function (sAnnotation) {
            return PatientData.getAttributeNameForAnnotation(mInteractionType, sAnnotation);
        });
    };

    /**
     * This function is called for each interaction.
     * @param {any} mEntry Interaction object
     * @param {any} mInteractionType Interaction type object
     * @param {any} mLane Lane object
     * @override
     */
    RisksController.prototype.addEntry = function (mEntry, mInteractionType /* , mLane*/) {
        var sClass = PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "ps_risk_class");
        var sColor;
        var nPriority = Infinity;
        if (this._mClasses[sClass]) {
            sColor = this._mClasses[sClass].color;
            nPriority = this._mClasses[sClass].priority;
        }
        var sText1 = PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_risk_text1");
        var sText2 = PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_risk_text2");
        this._mEntries.push({
            color: sColor,
            priority: nPriority,
            group: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_risk_group"),
            title: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_risk_advice"),
            date: mEntry.start,
            text: sText1 + (sText2 ? " - " + sText2 : ""),
            dateFormatted: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "interaction_start")
        });
    };

    /**
     * This function is called after the whole processing is done
     * @param {any} mResult PS config object
     * @override
     */
    RisksController.prototype.finishDataProcessing = function (mResult) {
        mResult.entries = this._mEntries;
        mResult.totalEntries = mResult.entries.length;

        // sort entries chronologically
        mResult.entries.sort(function (a, b) {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            if (a.date) {
                if (b.date) {
                    return b.date - a.date;
                } else {
                    return -1;
                }
            }
            return b ? 1 : 0;
        }, this);

        // keep only the 3 most recent entries
        mResult.entries = mResult.entries.slice(0, 3);
    };

    RisksController.prototype.processPatientData = function (mPatientData, mConfig, mUserState, mExtensionConfig) {
        // Take predefined class layout from the plugin settings
        this._mClasses = {};
        if (mConfig && mExtensionConfig && mExtensionConfig.settings && mExtensionConfig.settings.layout) {
            mExtensionConfig.settings.layout.forEach(function (mRisk, index) {
                this._mClasses[mRisk.class] = {
                    color: mRisk.color,
                    priority: index
                };
            }, this);
        }
        WidgetBaseController.prototype.processPatientData.apply(this, arguments);
    };

    RisksController.prototype.formatMoreText = function (sTemplate, nValue) {
        return jQuery.sap.formatMessage(sTemplate, nValue - 3);
    };

    RisksController.prototype.handleMorePress = function () {
        this.getOwnerComponent().navToTab("risks");
    };

    return RisksController;
});

