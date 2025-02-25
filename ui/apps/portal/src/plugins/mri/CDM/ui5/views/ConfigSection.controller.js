sap.ui.define([
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "hc/hph/cdw/config/ui/lib/BackendLinker",
    "sap/ui/core/mvc/Controller",
    "sap/m/TextArea",
    "sap/m/Button",
    "sap/m/Dialog"
], function (ConfigUtils, BackendLinker, Controller, TextArea, Button, Dialog) {
    "use strict";

    var view = Controller.extend("hc.hph.cdw.config.ui.views.ConfigSection", {
        onInit: function () {
            this._eventBus = sap.ui.getCore().getEventBus();
            this.getView().addStyleClass("sapMxConfigUi");

            this._configEditor = this.getView().byId("configEditorPage");

            this._navContainer = this.getView().byId("navCon");

            // events subscription
            this._eventBus.subscribe(
                ConfigUtils.configEvents.EVENT_CONFIG_SELECTED_CONFIG_VERSION,
                this._configVersionItemChanged,
                this
            );

        },
        onExit: function () {
            this._eventBus.unsubscribe(
                ConfigUtils.configEvents.EVENT_CONFIG_SELECTED_CONFIG_VERSION,
                this._configVersionItemChanged,
                this
            );
        },
        setModelManager: function (oModelMgr) {
            this._oModelMgr = oModelMgr;
            ["configEditorPage", "placeholdersPage", "settingsPage"].forEach((function(id) {
                this.getView().byId(id).oController.setModelManager(oModelMgr);
            }.bind(this)));
        },
        onBeforeRendering: function () {

        },
        onAfterRendering: function () {
            this._autoSave();
        },
        handleNav: function (evt) {
            var navCon = this.getView().byId("navCon");
            var target = evt.getParameters().listItem.data("target");
            if (target) {
                var destination = this.getView().byId(target); 
                var controller = destination.getController();
                controller.reset();
                navCon.to(destination);
            } else {
                navCon.back();
            }
        },
        onGenerateSuggestionsPressed: function () {

            var that = this;
            BackendLinker.getSuggestionConfig(function (result, oData) {
                var text;

                if (result === "error") {
                    ConfigUtils.logError("error", oData);
                    ConfigUtils.createAlertDialog("HPH_CDM_CFG_ERROR", "HPH_CDM_CFG_ERROR_REC_GEN_FAILED", oData ? oData : "");
                } else {
                    that._oModelMgr.addToModelFromConfig(oData);
                    ConfigUtils.createAlertDialog("HPH_CDM_CFG_SUCCESS", "HPH_CDM_CFG_ERROR_REC_GEN_SUCCEED");
                }
            });
        },
        onQueryCheckPressed: function () {
            var feConfig = this.getView().getModel(
                ConfigUtils.models.CONFIG_EDITOR).getData();

            this._eventBus
                .publish(
                ConfigUtils.configEvents.EVENT_CONFIG_REQUEST_QUERY_CHECK, {
                    feConfig: feConfig,
                    configName: feConfig.configName,
                    view: this.getView()
                });
        },
        onPreviewConfigPressed: function () {

            var that = this;
            var feConfig = this.getView().getModel(
                ConfigUtils.models.CONFIG_EDITOR).getData();

            this._oModelMgr
                .convertFrontendConfig(
                feConfig,
                function (result, meta, beConfig) {
                    if (result === "error") {
                        ConfigUtils.logError("error", arguments);

                        ConfigUtils.createAlertDialog("HPH_CDM_CFG_ERROR", "HPH_CDM_CFG_ERROR_CONVERT_FAILED", (beConfig ? ": " + beConfig : ""));

                    } else {

                        var configText = JSON.stringify(beConfig, null, 4);
                        var dialogHeight = "500px";
                        var dialogWidth = "500px";

                        var tView = new TextArea({
                            editable: false,
                            width: dialogWidth,
                            height: dialogHeight,
                            rows: 24
                            //Does not work on 1.22_03
                            //,value: configText
                        });
                        tView.setValue(configText);

                        // // Create a vertical
                        // scrollbar with size 200 px
                        // and 20 steps
                        // var vSB = new
                        // sap.ui.core.ScrollBar("vertSB");
                        // vSB.setSize("200px");
                        // vSB.setSteps(50);
                        // // Initial scroll position -
                        // in steps
                        // vSB.setScrollPosition(0);
                        //
                        // // attach scrollbar to some
                        // other element in the page
                        // vSB.placeAt(configDialog);

                        var configDialog = new Dialog({
                            title: ConfigUtils.getText("HPH_CDM_CFG_PREVIEW_CONFIG_TITLE"),
                            content: [tView],
                            contentHeight: dialogHeight,
                            contentWidth: dialogWidth,
                            initialFocus: tView.getId(),
                            endButton: new Button({
                                text: '{hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_PREVIEW_CONFIG_CLOSE}',
                                press: function () {
                                    configDialog.close();
                                }
                            }),
                            beginButton: new Button({
                                text: '{hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_PREVIEW_CONFIG_COPY}',
                                tooltip: '{hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_PREVIEW_CONFIG_COPY_TOOLTIP}',
                                press: function () {
                                    var textElements = tView.$().find("textarea, input");
                                    if (textElements.length > 0) {
                                        textElements[0].select();
                                        document.execCommand("copy");
                                    }
                                }
                            })
                        });

                        configDialog.setModel(that.getView().getModel("hc.hph.cdw.config.ui.i18n"), "hc.hph.cdw.config.ui.i18n");
                        configDialog.open();
                    }
                });
        },
        onSaveConfigPressed: function () {
            var feConfig = this.getView().getModel(
                ConfigUtils.models.CONFIG_EDITOR).getData();

            this._eventBus
                .publish(
                ConfigUtils.configEvents.EVENT_CONFIG_REQUEST_CONFIG_SAVE, {
                    feConfig: feConfig
                });
        },
        onSaveAndActivateConfigPressed: function () {
            var feConfig = this.getView().getModel(
                ConfigUtils.models.CONFIG_EDITOR).getData();
            this._eventBus
                .publish(
                ConfigUtils.configEvents.EVENT_CONFIG_REQUEST_CONFIG_SAVE_AND_ACTIVATION, {
                    feConfig: feConfig,
                    configName: feConfig.configName,
                    configId: feConfig.configId,
                    view: this.getView()
                });
        },
        _switchToView: function (viewId) {
            var view = this.getView().byId(viewId);
            view.getController().reset();
            this._navContainer.to(this.getView().byId(viewId));
        },
        _updateConfigModel: function (configEditorJSONModel) {
            this.getView().setModel(
                configEditorJSONModel,
                ConfigUtils.models.CONFIG_EDITOR);
        },
        _configVersionItemChanged: function (sChannelId, sEventId, oEventData) {
            this._switchToView("configEditorPage");
            this.getView().byId("cdmMenu").setSelected(true);
        },
        _autoSave: function () {
            var event = "focusout";
            var that = this;
            var excludedClass = ["EXCLUDEVALIDATE"];
            var includedTags = ["INPUT", "TEXTAREA", "BUTTON"];
            var includedClass = ["SAPTRIGGERSAVE", "SAPMCB"];

            $("div.divValidateThis")
                .off(event)
                .on(event, function (e) {

                    var tagName = e.target.tagName.toUpperCase();
                    var className = e.target.className.toUpperCase();

                    if (excludedClass.indexOf(className) === -1 &&
                        (includedTags.indexOf(tagName) !== -1 || includedClass.indexOf(className) !== -1)) {
                        setTimeout(function () {

                            var feConfig = that.getView().getModel(
                                ConfigUtils.models.CONFIG_EDITOR).getData();

                            that._eventBus
                                .publish(
                                ConfigUtils.configEvents.EVENT_CONFIG_AUTO_VALIDATION_AND_SAVE, {
                                    feConfig: feConfig,
                                    configName: feConfig.configName
                                });
                        }, 500);
                    }
                });
        }
    });

    return view;
});
