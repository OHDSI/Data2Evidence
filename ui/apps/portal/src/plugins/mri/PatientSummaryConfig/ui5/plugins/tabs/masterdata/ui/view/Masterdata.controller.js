sap.ui.define([
    "hc/hph/patient/app/ui/lib/PatientData",
    "hc/hph/patient/app/ui/lib/tab/TabBaseController"
], function (PatientData, TabBaseController) {
    "use strict";

    /**
     * Constructor for the Patient Summary Masterdata Controller.
     * @constructor
     *
     * @classdesc
     * This Controller is responsible for loading the patient data and handling all actions on the tabs of the Patient Summary.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.hph.patient.app.ui.content.view.Content
     */
    var MasterdataController = TabBaseController.extend("hc.hph.patient.plugins.tabs.masterdata.ui.view.Masterdata");

    MasterdataController.prototype.onInit = function () {
        TabBaseController.prototype.onInit.call(this);
    };

    MasterdataController.prototype.processPatientData = function (mPatientData, mConfig, mUserState, mExtensionConfig) {
        var mTabData = [];

        // For all groups, convert patterns to texts by replacing placeholders by attribute values
        if (mExtensionConfig && mExtensionConfig.settings.layout) {
            mTabData = JSON.parse(JSON.stringify(mExtensionConfig.settings.layout));

            if (mConfig && mConfig.masterdata && mPatientData && mPatientData.masterData) {
                var fReplaceAnnotation = function (_, p1) {
                    var aAttributes = mConfig.masterdata.annotations[p1];
                    if (!Array.isArray(aAttributes) || aAttributes.length !== 1) {
                        if (!Array.isArray(aAttributes)) {
                            jQuery.sap.log.error("No attribute found for annotation: " + p1);
                        } else {
                            jQuery.sap.log.error("Multiple attributes found for annotation: " + p1);
                        }
                        return p1;
                    }
                    return "{" + aAttributes[0] + "}";
                };
                // Master data lines formatter function
                var fFormatMasterdata = function (_, p2) {
                    if (!Array.isArray(mPatientData.masterData.attributes[p2])) {
                        jQuery.sap.log.error("MasterData attribute should be an array of values: " + p2);
                        return mPatientData.masterData.attributes[p2];
                    }
                    var oAttributeFormatter = PatientData.getAttributeFormatter(mConfig.masterdata.types[p2]);
                    return mPatientData.masterData.attributes[p2].map(oAttributeFormatter).join(", ");
                };

                mTabData.forEach(function (mGroup) {
                    mGroup.entries.forEach(function (mEntry) {
                        var sPattern = mEntry.pattern.replace(/{{(\w+)}}/g, fReplaceAnnotation);
                        mEntry.text = sPattern.replace(/{(\w+)}/g, fFormatMasterdata);
                    });
                });
            }
        }

        // If in a group, one entry has a label all other entries are filled up with at least " " as label
        mTabData.forEach(function (mGroup) {
            var bAtLeastOneLabel = mGroup.entries.some(function (mEntry) {
                return mEntry.label;
            });
            if (bAtLeastOneLabel) {
                mGroup.entries.forEach(function (mEntry) {
                    mEntry.label = mEntry.label || " ";
                });
            }
        });

        this.setPatientModel(mTabData);
    };

    MasterdataController.prototype.onExit = function () {
        TabBaseController.prototype.onExit.call(this);
    };

    return MasterdataController;
});
