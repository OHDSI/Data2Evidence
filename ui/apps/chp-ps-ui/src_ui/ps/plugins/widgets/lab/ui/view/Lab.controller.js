sap.ui.define([
    "sap/hc/hph/patient/app/ui/lib/utils/Utils",
    "sap/hc/hph/patient/app/ui/lib/PatientData",
    "sap/hc/hph/patient/app/ui/lib/tab/WidgetBaseController"
], function (Utils, PatientData, WidgetBaseController) {
    "use strict";

    /**
     * Constructor for the Patient Summary Lab Documents Controller.
     * @constructor
     *
     * @classdesc
     * This Controller is responsible for loading the patient data and handling all actions on the tabs of the Patient Summary.
     * @extends sap.ui.core.mvc.Controller
     * @alias sap.hc.hph.patient.app.ui.content.view.Content
     */
    var LabController = WidgetBaseController.extend("sap.hc.hph.patient.plugins.widgets.lab.ui.view.Lab");

    var aAnnotations = [
        "ps_lab_title",
        "interaction_start"
    ];

    /**
     * This function is called before the whole processing starts.
     * @param {any} mConfig Patient Summary configuration
     * @override
     */
    LabController.prototype.startDataProcessing = function (/* mConfig */) {
        //
        // TARGET MODEL STRUCTURE
        // {
        //    entries: [],
        //    totalEntries: 0
        // }
        //
        // SINGLE LAB RESULT
        // {
        //     title: "AK Pflegerischer Dekurs Aufwachraum",
        //     date: new Date("2010-01-21")
        // }

        // initialize temporary storage for lab, used during data processing
        this._mEntries = [];
    };

    /**
     * This function is called before processing an interaction type of a lane.
     * @param {any} mInteractionType Interaction type object
     * @param {any} mLane Lane object
     * @override
     */
    LabController.prototype.startInteractionType = function (mInteractionType /* , mLane */) {
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
    LabController.prototype.addEntry = function (mEntry, mInteractionType /* , mLane*/) {
        this._mEntries.push({
            title: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_lab_title"),
            url: PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "ps_lab_url"),
            date: mEntry.start,
            dateFormatted: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "interaction_start")
        });
    };

    /**
     * This function is called after the whole processing is done
     * @param {any} mResult PS config object
     * @override
     */
    LabController.prototype.finishDataProcessing = function (mResult) {
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

    LabController.prototype.formatMoreText = function (sTemplate, nValue) {
        return jQuery.sap.formatMessage(sTemplate, nValue - 3);
    };

    LabController.prototype.handleMorePress = function () {
        this.getOwnerComponent().navToTab("lab");
    };

    LabController.prototype.showDocument = function (oEvent) {
        var sUrl = oEvent.getSource().getCustomData()[0].getValue("url");
        if (sUrl && sUrl !== PatientData.NO_VALUE) {
            // Open document URL
            window.open(sUrl, "_self");
        }
    };

    return LabController;
});

