sap.ui.define([
    "sap/hc/hph/patient/app/ui/lib/PatientData",
    "sap/hc/hph/patient/plugins/widgets/masterdata/ui/lib/Utils",
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel"
], function (PatientData, Utils, UIComponent, JSONModel) {
    "use strict";

    /**
     * Patient Summary Masterdata Widget Extension.
     * @constructor
     *
     * @extends sap.hc.hph.patient.ui.content.extension.WidgetComponentBase
     * @alias sap.hc.hph.patient.plugins.widgets.masterdata.ui.Extension
     */
    var WidgetComponent = UIComponent.extend("sap.hc.hph.patient.plugins.widgets.masterdata.ui.Extension", {
        metadata: {
            rootView: "sap.hc.hph.patient.plugins.widgets.masterdata.ui.view.Masterdata",
            properties: {
                // extensionConfig: {
                //     type: "object"
                // },
                config: {
                    type: "object"
                },
                patientData: {
                    type: "object"
                }
            }
        }
    });

    /**
     * Initialize the component.
     * @override
     * @protected
     */
    WidgetComponent.prototype.init = function () {
        UIComponent.prototype.init.apply(this, arguments);

        // Set patient model
        this.setModel(new JSONModel());
    };

    WidgetComponent.prototype.reprocessData = function () {
        // Process retrieved patient data
        var mResult = {};
        var mMasterDataConfig = this.getConfig() && this.getConfig().masterdata;
        var mMasterData = this.getPatientData() && this.getPatientData().masterData;
        if (mMasterDataConfig && mMasterData) {
            mResult = PatientData.processMasterData(mMasterData, mMasterDataConfig);
        }
        this.getModel().setData(mResult);
    };

    WidgetComponent.prototype.setConfig = function (mConfig) {
        this.setProperty("config", mConfig, true);
        this.reprocessData();
    };

    WidgetComponent.prototype.setPatientData = function (mPatientData) {
        this.setProperty("patientData", mPatientData, true);
        this.reprocessData();
    };

    WidgetComponent.prototype.getText = function () {
        return "noname";
    };

    return WidgetComponent;
});
