sap.ui.define([
    "jquery.sap.global",
    "hc/mri/pa/config/ui/lib/ConfigUtils",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (jQuery, ConfigUtils, Controller, JSONModel) {
    "use strict";

    /**
     * Constructor for the MainEditor Controller.
     * @constructor
     *
     * @classdesc
     * Controller for the app.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.mri.pa.config.ui.views.MainEditor
     */
    var MainEditorController = Controller.extend("hc.mri.pa.config.ui.views.MainEditor");

    MainEditorController.prototype.onInit = function () {
        this.dataModelCombo = this.byId("dataModelConfigurationsCombo");
        this.configListView = this.byId("anConfigList");
        this._oEventBus = sap.ui.getCore().getEventBus();
        var that = this;

        this._setInitDataModel(function () {
            that._oEventBus.subscribe(
                ConfigUtils.configEvents.CONFIG_ANALYTICS_CHANGED,
                that._configWasChanged,
                that
            );

            that._oEventBus.subscribe(
                ConfigUtils.configEvents.CONFIG_ANALYTICS_DELETED,
                that._configWasDeleted,
                that
            );

            that._loadConfig();
        });
    };

    MainEditorController.prototype._loadConfig = function () {
        var dmConfigList = this._getDmConfigList();
        if (dmConfigList && dmConfigList.length > 0) {
            this.dataModelCombo.setSelectedKey(dmConfigList[0].configId).fireSelectionChange();
            this.configListView.byId("mriConfigList").setSelectedItem(this.configListView.byId("mriConfigList").getItems()[0]);
        }
    };

    MainEditorController.prototype.onExit = function () {
        this._oEventBus.unsubscribe(
            ConfigUtils.configEvents.CONFIG_ANALYTICS_CHANGED,
            this._configWasChanged,
            this
        );

        this._oEventBus.unsubscribe(
            ConfigUtils.configEvents.CONFIG_ANALYTICS_DELETED,
            this._configWasDeleted,
            this
        );
    };

    MainEditorController.prototype._setInitDataModel = function (callback) {
        var aConfigs = [];
        var that = this;

        this._getAllConfigs(function (result, oData) {
            if (result === "success") {
                aConfigs = oData;

                // TODO delete when the BE call is finalized
                // aConfigs = that._getMockedConfig();

                aConfigs.forEach(function (mDmConfig) {
                    mDmConfig.configs = mDmConfig.configs.map(function (mMriConfig) {
                        mMriConfig.frontEndProperties = ConfigUtils.getFrontEndPropertiesObject(true);
                        return mMriConfig;
                    });
                }, this);

                var oModel = new JSONModel({
                    dmConfigList: aConfigs
                });
                // Increase binding limit as 100 might not be sufficient
                oModel.setSizeLimit(Infinity);

                that.getView().setModel(oModel, "analyticsModel");
            } else {
                ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ERROR_IN_LOADING", oData ? oData : "");
            }

            callback();
        }.bind(this));
    };

    MainEditorController.prototype._getAllConfigs = function (callback) {
        ConfigUtils.ajax({
            url: "/pa-config-svc/services/config.xsjs",
            type: "POST",
            dataType: "json",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify({
                action: "getAll"
            })
        }).done(function (mData) {
            callback("success", mData);
        }).fail(function (xhr, textStatus, error) {
            callback("error", error);
        });
    };

    MainEditorController.prototype._getCurrentDataModelDetails = function () {
        var configDetails = {
            configId: null,
            configName: null
        };
        var selectedKey = this.dataModelCombo.getSelectedKey();
        if (selectedKey && selectedKey !== "") {
            configDetails.configId = selectedKey;
            configDetails.configName = this.dataModelCombo.getSelectedItem().getText();
        }
        return configDetails;
    };

    MainEditorController.prototype._getDataModelIndex = function (dataModelConfigKey) {
        var dmConfigList = this._getDmConfigList();
        var iIndex = -1;

        if (dataModelConfigKey && dataModelConfigKey !== "") {
            jQuery.grep(dmConfigList, function (e, index) {
                if (e.configId === dataModelConfigKey) {
                    iIndex = index;
                    return true;
                }
                return false;
            });
        }
        return iIndex;
    };

    /**
     * Handler for the press event on the add Config button.
     * Creates and opens the Popover at the event source.
     */
    MainEditorController.prototype.onAddConfiguration = function () {
        var dataModelDetails = this._getCurrentDataModelDetails();
        if (!dataModelDetails.configId) {
            ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ADMIN_CHOOSE_DATA_MODEL");
        } else {
            var index = this._getDataModelIndex(dataModelDetails.configId);
            if (index >= 0) {
                this.configListView.getController().onAddEmptyMriConfiguration();
            }
        }
    };

    MainEditorController.prototype.onImportConfiguration = function () {
        var dataModelDetails = this._getCurrentDataModelDetails();
        if (!dataModelDetails.configId) {
            ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ADMIN_CHOOSE_DATA_MODEL");
            return;
        }
        this.configListView.getController().onImportConfiguration(null);
    };

    /**
     * Handler for the change of the selection event on the data model combo.
     * refreshes the application config list
     */
    MainEditorController.prototype.onDataModelChanged = function () {
        var combo = this.byId("dataModelConfigurationsCombo");
        var newValueKey = combo.getSelectedKey();
        this._refreshCdwConfigListByDataModelConfig(newValueKey);
    };

    MainEditorController.prototype._configWasChanged = function () {
        this.byId("anConfigAll").setVisible(true);
    };

    MainEditorController.prototype._configWasDeleted = function () {
        this.byId("anConfigAll").setVisible(false);
    };

    MainEditorController.prototype._refreshCdwConfigListByDataModelConfig = function (dataModelConfigKey) {
        var dmConfigListView = this.byId("anConfigList");
        var dmConfigList = this._getDmConfigList();
        var that = this;
        var runCB = function (cb) {
            setTimeout(cb, 100);
        };

        if (!dataModelConfigKey || dataModelConfigKey === "") {
            // TODO: Handle no dataModelConfigKey
        } else {
            var iIndex = null;
            var result = jQuery.grep(dmConfigList, function (e, index) {
                if (e.configId === dataModelConfigKey) {
                    iIndex = index;
                    return true;
                }
                return false;
            });

            if (result.length > 0) {
                dmConfigListView.bindContext("analyticsModel>/dmConfigList/" + iIndex);
                if (dmConfigList[iIndex].configs && dmConfigList[iIndex].configs.length > 0) {
                    dmConfigListView.byId("mriConfigList").setSelectedItem(dmConfigListView.byId("mriConfigList").getItems()[0]);

                    runCB(function () {
                        that._oEventBus.publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_CHANGED, {
                            path: "/dmConfigList/" + iIndex + "/configs/0",
                            parentPath: "/dmConfigList/" + iIndex
                        });
                    });
                } else {
                    this.byId("anConfigAll").setVisible(false);

                    runCB(function () {
                        that._oEventBus.publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_UPDATE_FINISHED);
                    });
                }
            }
        }
    };

    MainEditorController.prototype._getDmConfigList = function () {
        return this.getView().getModel("analyticsModel").getData().dmConfigList;
    };

    return MainEditorController;
});
