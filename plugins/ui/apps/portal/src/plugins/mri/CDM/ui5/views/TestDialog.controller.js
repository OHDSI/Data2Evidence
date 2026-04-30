sap.ui.define([
    "jquery.sap.global",
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (jQuery, ConfigUtils, Controller, JSONModel) {
    "use strict";

    var TestDialogController = Controller.extend("hc.hph.cdw.config.ui.views.TestDialog");

    TestDialogController.prototype.onInit = function () {
        this.getView().setModel(new JSONModel({
            testMinValue: "",
            testMaxValue: "",
            testCountValue: "",
            testSqlCheck: "",
            testErrorDetails: "",
            testSampleValues: []
        }), "testModel");
    };

    TestDialogController.prototype.formatErrorMessage = function (sMessageKey, sDetails) {
        if (!sMessageKey) {
            return "";
        }

        // Special case: Permission-denied message uses details as i18n parameter (dataset name)
        // instead of appending it as additional text
        if (sMessageKey === "HPH_CDM_CFG_TEST_NO_PERMISSION" && sDetails) {
            return ConfigUtils.getText(sMessageKey, [sDetails]);
        }

        // Standard case: Get message text and optionally append details
        var sMessage = ConfigUtils.getText(sMessageKey);
        if (sDetails) {
            sMessage += "\n";
            sMessage += sDetails;
        }
        return sMessage;
    };

    return TestDialogController;
});
