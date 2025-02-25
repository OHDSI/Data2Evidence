sap.ui.define([
    "jquery.sap.global",
    "hc/hph/patient/app/ui/lib/utils/Utils",
    "hc/hph/patient/app/ui/lib/PatientData",
    "hc/hph/patient/app/ui/lib/tab/TabBaseController"
], function (jQuery, Utils, PatientData, TabBaseController) {
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
    var RisksController = TabBaseController.extend("hc.hph.patient.plugins.tabs.risks.ui.view.Risks");

    var aAnnotationsMandatory = [
        "ps_risk_class",
        "ps_risk_group",
        "ps_risk_advice",
        "ps_risk_text1",
        "ps_risk_text2",
        "interaction_start"
    ];

    var aAnnotationsAll = [
        "ps_risk_class",
        "ps_risk_class_text",
        "ps_risk_group",
        "ps_risk_advice",
        "ps_risk_text1",
        "ps_risk_text2",
        "interaction_start"
    ];

    RisksController.prototype.startInteractionType = function (mInteractionType /* , mLane */) {
        // Ignore interactions that have not all mandatory annotations
        return aAnnotationsMandatory.every(function (sAnnotation) {
            return PatientData.getAttributeNameForAnnotation(mInteractionType, sAnnotation);
        });
    };

    RisksController.prototype._parseRawRisk = function (mEntry, mInteractionType) {
        // Extract attributes based on annotations
        return aAnnotationsAll.reduce(function (mPrev, sAnnotation) {
            mPrev[sAnnotation] = PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, sAnnotation);
            return mPrev;
        }, {
            classId: PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "ps_risk_class"),
            groupId: PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "ps_risk_group"),
            date: mEntry.start
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
        var mRisk = this._parseRawRisk(mEntry, mInteractionType);

        // Identify the corresponding class by class id
        var mClass = this._mClasses.filter(function (mRiskClass) {
            return mRiskClass.class === mRisk.classId;
        })[0];
        if (!mClass) {
            // Class is not configured in the plugin settings, take title or class from the risk entry, use default color (black)
            mClass = {
                title: mRisk.ps_risk_class_text || mRisk.classId,
                class: mRisk.classId,
                groups: []
            };
            // Add new class
            this._mClasses.push(mClass);
        } else {
            // If no class title was given in the plugin settings, take title or class from the risk entry
            mClass.title = mClass.title || mRisk.ps_risk_class_text || mRisk.classId;
        }

        // Identify the corresponding group by group name
        if (mRisk.groupId === PatientData.NO_VALUE) {
            mRisk.groupId = "";
        }
        var mGroup = mClass.groups.filter(function (mRiskGroup) {
            return mRiskGroup.title === mRisk.groupId;
        })[0];
        if (!mGroup) {
            // Add new group
            mGroup = {
                title: mRisk.groupId,
                entries: []
            };
            mClass.groups.push(mGroup);
        }

        // Add new risk entry to group
        mGroup.entries.push({
            title: mRisk.ps_risk_advice,
            text1: mRisk.ps_risk_text1,
            text2: mRisk.ps_risk_text2,
            start: mRisk.interaction_start,
            date: mRisk.date
        });
    };

    RisksController.prototype.processPatientData = function (mPatientData, mConfig, mUserState, mExtensionConfig) {
        // Take predefined class layout from the plugin settings
        this._mClasses = [];
        if (mConfig && mExtensionConfig && mExtensionConfig.settings && mExtensionConfig.settings.layout) {
            this._mClasses = JSON.parse(JSON.stringify(mExtensionConfig.settings.layout || []));
            this._mClasses.forEach(function (mRisk) {
                mRisk.groups = mRisk.groups || [];
            });
        }
        TabBaseController.prototype.processPatientData.apply(this, arguments);
    };

    // This function is called after all lanes have been processed
    RisksController.prototype.finishDataProcessing = function (mResult) {
        // Remove all optional and empty classes
        this._mClasses = this._mClasses.filter(function (mClass) {
            return !(mClass.groups.length === 0 && mClass.optional);
        });
        // Add dummy group to empty classes to show "No entries" text (see PS_PLUGINS_TABS_RISK_NO_ENTRIES)
        this._mClasses.forEach(function (mClass) {
            if (mClass.groups.length === 0) {
                mClass.groups = [{
                    title: "",
                    entries: []
                }];
            } else {
                mClass.groups.sort(function (a, b) {
                    return a.title.localeCompare(b.title);
                });
            }
        });
        mResult.classes = this._mClasses;
    };

    return RisksController;
});

