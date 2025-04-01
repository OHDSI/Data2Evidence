sap.ui.define([
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "hc/hph/cdw/config/ui/lib/BackendLinker",
    "sap/ui/core/mvc/Controller",
    "sap/m/TextArea",
    "sap/m/Button",
    "sap/m/Dialog"
], function (ConfigUtils, BackendLinker, Controller, TextArea, Button, Dialog) {
    "use strict";

    var ConfigEditorController = Controller.extend("hc.hph.cdw.config.ui.views.ConfigEditor");

    ConfigEditorController.prototype.onInit = function () {
        this._eventBus = sap.ui.getCore().getEventBus();

        this.testDialogContent = new sap.ui.xmlview("hc.hph.cdw.config.ui.views.TestDialog");
        var that = this;

        this.testDialog = new Dialog({
            content: [this.testDialogContent],
            resizable: false,
            beginButton: new Button({
                text: '{hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_TEST_ATTRIBUTE_CLOSE}',
                press: function () {
                    that.testDialog.close();
                }
            })
        });

        this.oTestModel = this.testDialogContent
            .getModel("testModel");

        this.noErrorMsg = "HPH_CDM_CFG_TEST_NO_ERRORS";
        this.testDialogContent.byId("samplesBox")
            .bindAggregation("items", {
                path: "testModel>/testSampleValues",
                factory: function (sId) {
                    return new sap.ui.core.ListItem(sId, {
                        text: "{testModel>}"
                    });
                }
            });

        if (!this.filterCardsView) {
            this.filterCardsView = sap.ui.xmlview({ type: sap.ui.core.mvc.ViewType.XML, viewName: "hc.hph.cdw.config.ui.views.FilterCardsList" });
        }

        if (!this.configEditorDetailsView) {
            this.configEditorDetailsView = sap.ui.xmlview({ type: sap.ui.core.mvc.ViewType.XML, viewName: "hc.hph.cdw.config.ui.views.ConfigEditorDetails" });
        }

        this._layout1 = this.getView().byId("filterCardsListLayout");
        this._layout1.addContent(this.filterCardsView);
        this._layout1.setVisible(true);

        this._configEditorDetailsLayout = this.getView().byId(
            "configEditorDetailsLayout");
        this._configEditorDetailsLayout.addContent(this.configEditorDetailsView);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_SWITCH_LAYOUT,
            this._switchToDefaultLayout,
            this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_TEST_ATTR,
            this._testAttribute,
            this);

        this.getView().addStyleClass("sapMxConfigUi");
    };

    ConfigEditorController.prototype.onBeforeRendering = function () { };

    ConfigEditorController.prototype.onAfterRendering = function () {

    };

    ConfigEditorController.prototype.setModelManager = function (oModelMgr) {
        this._oModelMgr = oModelMgr;
    };

    ConfigEditorController.prototype.onNavigateToMainConfig = function () {

        this._eventBus
            .publish(
            ConfigUtils.configEvents.EVENT_CONFIG_HIDE_FC, {

            });

        this._eventBus
            .publish(
            ConfigUtils.configEvents.EVENT_CONFIG_NAVIGATE_BACK, {

            });
    };

    ConfigEditorController.prototype.onValidateConfigPressed = function () {
        var feConfig = this.getView().getModel(
            ConfigUtils.models.CONFIG_EDITOR).getData();

        this._eventBus
            .publish(
            ConfigUtils.configEvents.EVENT_CONFIG_REQUEST_VALIDATION, {
                feConfig: feConfig,
                configName: feConfig.configName
            });

    };

    ConfigEditorController.prototype._switchToDefaultLayout = function () {
        var layout2 = this._configEditorDetailsLayout;
        layout2.removeAllContent();
        layout2.addContent(this.configEditorDetailsView);
    };

    ConfigEditorController.prototype._testDialogShow = function (showData) {
        var testDialogControls = ["minFieldLabel", "minField", "maxFieldLabel", "maxField", "countFieldLabel", "countField", "testSamplesContainerLabel", "testSamplesContainer"];
        var that = this;
        testDialogControls.forEach(function (control) {
            var cnt = that.testDialogContent.byId(control);
            if (cnt) {
                cnt.setVisible(showData);
            }
        });
    };

    ConfigEditorController.prototype._testAttribute = function (sChannelId, sEventId, oEventData) {

        var path = oEventData.path;
        var attrName = oEventData.attributeName;
        var exprToUse = oEventData.exprToUse;
        var useRefText = oEventData.useRefText;
        var feConfig = this.getView().getModel(
            ConfigUtils.models.CONFIG_EDITOR).getData();
        var that = this;
        this.testDialogContent.byId("matrixLayout").setBusy(
            true);

        var testModelData = {
            testMinValue: "",
            testMaxValue: "",
            testCountValue: "",
            testSqlCheck: "",
            testSampleValues: []
        };

        this.oTestModel.setData(testModelData);

        var testDialogi18nModel = this.testDialog.getModel("hc.hph.cdw.config.ui.i18n");
        if (!testDialogi18nModel) {
            this.testDialog.setModel(this.getView().getModel("hc.hph.cdw.config.ui.i18n"), "hc.hph.cdw.config.ui.i18n");
        }

        var testDialogContenti18nModel = this.testDialogContent.getModel("hc.hph.cdw.config.ui.i18n");
        if (!testDialogContenti18nModel) {
            this.testDialogContent.setModel(this.getView().getModel("hc.hph.cdw.config.ui.i18n"), "hc.hph.cdw.config.ui.i18n");
        }

        this.testDialog.bindProperty("title", {
            model: "hc.hph.cdw.config.ui.i18n",
            path: "HPH_CDM_CFG_TEST_TESTING"
        });
        this.testDialog.open();

        this._oModelMgr
            .convertFrontendPath(
            feConfig,
            path,
            function (result, generatedConf) {
                if (result === "error") {
                    // xs errors
                    that.testDialogContent.byId(
                        "matrixLayout")
                        .setBusy(false);
                    testModelData.testSqlCheck = "HPH_CDM_CFG_TEST_INTERNAL_ERROR";
                    that.oTestModel
                        .setData(testModelData);

                }
                if (result === "success") {
                    BackendLinker
                        .testConfig(
                        generatedConf.config,
                        generatedConf.path,
                        exprToUse,
                        useRefText,
                        // function
                        // called when
                        // the
                        // aggregation
                        // data is
                        // returned
                        function (
                            result,
                            data) {
                            that.testDialogContent
                                .byId(
                                "matrixLayout")
                                .setBusy(
                                false);

                            if (result === "error") {
                                // xs level errors
                                testModelData.testSqlCheck = "HPH_CDM_CFG_TEST_XS_ERROR";
                                testModelData.testErrorDetails = that.editErrorMessage(data);

                                that._testDialogShow(false);
                                that.oTestModel
                                    .setData(testModelData);

                            } else {
                                if (data.exception) {
                                    // sql catched exceptions
                                    testModelData.testSqlCheck = "HPH_CDM_CFG_TEST_SQL_ERROR";
                                    testModelData.testErrorDetails = that.editErrorMessage(data.exception);
                                    that._testDialogShow(false);
                                    that.oTestModel
                                        .setData(testModelData);

                                } else {
                                    testModelData.testMinValue = data.data[0].min;
                                    testModelData.testMaxValue = data.data[0].max;
                                    testModelData.testCountValue = data.data[0].count;
                                    testModelData.testSqlCheck = that.noErrorMsg;
                                    testModelData.testErrorDetails = "";
                                    that._testDialogShow(data.data[0].permission);
                                    that.oTestModel
                                        .setData(testModelData);

                                }
                            }
                        },
                        // function
                        // called when
                        // the sample
                        // data is
                        // returned
                        function (
                            result,
                            data) {
                            that.testDialogContent
                                .byId(
                                "matrixLayout")
                                .setBusy(
                                false);
                            if (result === "error") {
                                // xs level errors
                                testModelData.testSqlCheck = "HPH_CDM_CFG_TEST_XS_ERROR";
                                testModelData.testErrorDetails = data;
                                that.oTestModel
                                    .setData(testModelData);

                            } else {
                                if (data.exception) {
                                    testModelData.testSqlCheck = "HPH_CDM_CFG_TEST_SQL_ERROR";
                                    testModelData.testErrorDetails = data.exception;
                                    that.oTestModel
                                        .setData(testModelData);

                                } else {
                                    if (typeof data.data[0] === "object") {
                                        testModelData.testSampleValues = data.data
                                            .map(function (
                                                elem) {
                                                return elem.value + " " + elem.text;
                                            });
                                        that.oTestModel
                                            .setData(testModelData);
                                    } else {
                                        testModelData.testSampleValues = data.data;
                                        that.oTestModel
                                            .setData(testModelData);
                                    }
                                }
                            }
                        }

                        );
                }

            });

    };

    ConfigEditorController.prototype.onExit = function () {

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_SWITCH_LAYOUT,
            this._switchToDefaultLayout,
            this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_TEST_ATTR,
            this._testAttribute,
            this);
    };

    ConfigEditorController.prototype.editErrorMessage = function (err) {
        var returnValue = err.replace("HPH_CDM_CFG_TEST_ERRORS_FAIL_TYPE_MISMATCH", ConfigUtils.getText("HPH_CDM_CFG_TEST_ERRORS_FAIL_TYPE_MISMATCH"))
            .replace("HPH_CDM_CFG_VALIDITY_ERROR", ConfigUtils.getText("HPH_CDM_CFG_VALIDITY_ERROR"));
        return returnValue;
    };

    ConfigEditorController.prototype.reset = function () {
        this._eventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_HIDE_ATTRIBUTE,{});
        this._eventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_HIDE_FC, {});
    };

    return ConfigEditorController;
});
