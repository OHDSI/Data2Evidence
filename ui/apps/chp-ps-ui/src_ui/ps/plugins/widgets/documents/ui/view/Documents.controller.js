sap.ui.define([
    "sap/hc/hph/patient/app/ui/lib/utils/Utils",
    "sap/hc/hph/patient/app/ui/lib/PatientData",
    "sap/hc/hph/patient/app/ui/lib/tab/WidgetBaseController"
], function (Utils, PatientData, WidgetBaseController) {
    "use strict";

    /**
     * Constructor for the Patient Summary Documents Controller.
     * @constructor
     *
     * @classdesc
     * This Controller is responsible for loading the patient data and handling all actions on the tabs of the Patient Summary.
     * @extends sap.ui.core.mvc.Controller
     * @alias sap.hc.hph.patient.app.ui.content.view.Content
     */
    var DocumentsController = WidgetBaseController.extend("sap.hc.hph.patient.plugins.widgets.documents.ui.view.Documents");

    var aAnnotations = [
        "ps_doc_title",
        "interaction_start"
    ];

    /**
     * This function is called before the whole processing starts.
     * @param {any} mConfig Patient Summary configuration
     * @override
     */
    DocumentsController.prototype.startDataProcessing = function (/* mConfig */) {
        //
        // TARGET MODEL STRUCTURE
        // {
        //    entries: [],
        //    totalEntries: 0
        // }
        //
        // SINGLE DOCUMENT
        // {
        //     title: "AK Pflegerischer Dekurs Aufwachraum",
        //     date: new Date("2010-01-21")
        // }

        // initialize temporary storage for documents, used during data processing
        this._mEntries = [];
    };

    /**
     * This function is called before processing an interaction type of a lane.
     * @param {any} mInteractionType Interaction type object
     * @param {any} mLane Lane object
     * @override
     */
    DocumentsController.prototype.startInteractionType = function (mInteractionType /* , mLane */) {
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
    DocumentsController.prototype.addEntry = function (mEntry, mInteractionType /* , mLane*/) {
        this._mEntries.push({
            title: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_doc_title"),
            url: PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "ps_doc_url"),
            date: mEntry.start,
            dateFormatted: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "interaction_start")
        });
    };

    /**
     * This function is called after the whole processing is done
     * @param {any} mResult PS config object
     * @override
     */
    DocumentsController.prototype.finishDataProcessing = function (mResult) {
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

    DocumentsController.prototype.formatMoreText = function (sTemplate, nValue) {
        return jQuery.sap.formatMessage(sTemplate, nValue - 3);
    };

    DocumentsController.prototype.handleMorePress = function () {
        this.getOwnerComponent().navToTab("documents");
    };

    DocumentsController.prototype.showDocument = function (oEvent) {
        var sUrl = oEvent.getSource().getCustomData()[0].getValue("url");
        if (sUrl && sUrl !== PatientData.NO_VALUE) {
            // Open document URL
            window.open(sUrl, "_self");
        }
    };

    return DocumentsController;
});

