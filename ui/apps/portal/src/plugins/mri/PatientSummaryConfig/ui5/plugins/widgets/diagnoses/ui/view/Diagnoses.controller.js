sap.ui.define([
    "hc/hph/patient/app/ui/lib/utils/Utils",
    "hc/hph/patient/app/ui/lib/PatientData",
    "hc/hph/patient/app/ui/lib/tab/WidgetBaseController"
], function (Utils, PatientData, WidgetBaseController) {
    "use strict";

    /**
     * Constructor for the Patient Summary Diagnoses Controller.
     * @constructor
     *
     * @classdesc
     * This Controller is responsible for loading the patient data and handling all actions on the tabs of the Patient Summary.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.hph.patient.app.ui.content.view.Content
     */
    var DiagnosesController = WidgetBaseController.extend("hc.hph.patient.plugins.widgets.diagnoses.ui.view.Diagnoses");

    var aAnnotations = [
        "ps_diag_freetext",
        "interaction_start"
    ];

    /**
     * This function is called before the whole processing starts.
     * @param {any} mConfig Patient Summary configuration
     * @override
     */
    DiagnosesController.prototype.startDataProcessing = function (/* mConfig */) {
        //
        // TARGET MODEL STRUCTURE
        // {
        //    entries: [],
        //    totalEntries: 0
        // }
        //
        // SINGLE DIAGNOSIS
        // {
        //     title: "AK Pflegerischer Dekurs Aufwachraum",
        //     date: new Date("2010-01-21")
        // }

        // initialize temporary storage for diagnoses, used during data processing
        this._mEntries = [];
    };

    /**
     * This function is called before processing an interaction type of a lane.
     * @param {any} mInteractionType Interaction type object
     * @param {any} mLane Lane object
     * @override
     */
    DiagnosesController.prototype.startInteractionType = function (mInteractionType /* , mLane */) {
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
    DiagnosesController.prototype.addEntry = function (mEntry, mInteractionType /* , mLane*/) {
        this._mEntries.push({
            title: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_diag_freetext"),
            date: mEntry.start,
            dateFormatted: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "interaction_start")
        });
    };

    /**
     * This function is called after the whole processing is done
     * @param {any} mResult PS config object
     * @override
     */
    DiagnosesController.prototype.finishDataProcessing = function (mResult) {
        mResult.entries = this._mEntries;
        mResult.totalEntries = mResult.entries.length;

        // sort entries chronologically
        mResult.entries.sort(function (a, b) {
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

    DiagnosesController.prototype.formatMoreText = function (sTemplate, nValue) {
        return jQuery.sap.formatMessage(sTemplate, nValue - 3);
    };

    DiagnosesController.prototype.handleMorePress = function () {
        this.getOwnerComponent().navToTab("diagnoses");
    };

    return DiagnosesController;
});

