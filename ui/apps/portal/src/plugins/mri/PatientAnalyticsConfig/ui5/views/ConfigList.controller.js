sap.ui.define([
    "jquery.sap.global",
    "hc/hph/core/ui/JSONBinding/DeepJSONPropertyBinding",
    "hc/mri/pa/config/ui/lib/ConfigUtils",
    "sap/m/MessageBox",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (jQuery, DeepJSONPropertyBinding, ConfigUtils, MessageBox, Controller, JSONModel) {
    "use strict";

    /**
     * Constructor for the ConfigList Controller.
     * @constructor
     *
     * @classdesc
     * Controller for the config list in the master page of the split layout.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.mri.pa.config.ui.views.ConfigList
     */
    var ConfigListController = Controller.extend("hc.mri.pa.config.ui.views.ConfigList");

    ConfigListController.prototype.onInit = function () {
        this._oEventBus = sap.ui.getCore().getEventBus();
        this._mriConfigList = this.byId("mriConfigList");
        this._oEventBus.subscribe(ConfigUtils.configEvents.CONFIG_ANALYTICS_UPDATE_FINISHED, this.attachConfigChange, this);
    };

    ConfigListController.prototype.onExit = function () {
        this._oEventBus.unsubscribe(ConfigUtils.configEvents.CONFIG_ANALYTICS_UPDATE_FINISHED, this.attachConfigChange, this);
    };

    ConfigListController.prototype.attachConfigChange = function () {
        var oModel = this.getView().getModel("analyticsModel");

        var sConfigPath = this._getCurrentConfigPath();
        var oContext = oModel.getContext(sConfigPath + "/config");
        if (this.changeBinding) {
            this.changeBinding.setContext(oContext);
        } else {
            this.changeBinding = new DeepJSONPropertyBinding(oModel, "", oContext);
            this.changeBinding.attachChange(this.onConfigModified, this);
        }
    };

    /**
     * Handler for the event of the Edit Config.
     * Should load the relevant application config on the right side
     * @param {sap.ui.base.Event} oEvent CustomListItem press Event
     */
    ConfigListController.prototype.onChooseMriConfig = function (oEvent) {
        var listItem = oEvent.getParameter("listItem");
        this.selectMriConfig(listItem);
    };

    /**
     * Handler for the event selecting a Config.
     * All controls that are inside the listItem must call this to trigger the selection of config
     * @param {sap.m.CustomListItem} listItemCtrl CustomListItem control
     */
    ConfigListController.prototype.selectMriConfig = function (listItemCtrl) {
        var oAnalyticsModel = this.getView().getModel("analyticsModel");
        var path = listItemCtrl.getBindingContext("analyticsModel").getPath();
        var parentPath = this.getView().getBindingContext("analyticsModel").getPath();

        var mriConfig = oAnalyticsModel.getProperty(path);
        if (!mriConfig.frontEndProperties) {
            mriConfig.frontEndProperties = ConfigUtils.getFrontEndPropertiesObject(true);
            oAnalyticsModel.setProperty(path, mriConfig);
        }

        this._oEventBus.publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_CHANGED, {
            path: path,
            parentPath: parentPath
        });

        if (!listItemCtrl.getSelected()) {
            listItemCtrl.setSelected(true);
        }
    };

    ConfigListController.prototype._getCurrentConfigPath = function () {
        var aSelectedItemContextPaths = this._mriConfigList.getSelectedContextPaths();
        if (Array.isArray(aSelectedItemContextPaths) && aSelectedItemContextPaths.length > 0) {
            return aSelectedItemContextPaths[0];
        }
    };

    /**
     * Handler for changes to the configuration.
     * Updates the config state.
     */
    ConfigListController.prototype.onConfigModified = function () {
        var oModel = this.getView().getModel("analyticsModel");

        var sConfigPath = this._getCurrentConfigPath();
        if (sConfigPath) {
            var oContext = oModel.getContext(sConfigPath);

            var oConfig = oContext.getProperty("config");
            var bSaved = this._getFrontEndProperty(sConfigPath, "isSaved");
            if (oConfig && bSaved) {
                var originalHash = this._getFrontEndProperty(sConfigPath, "originalHash");
                var newHash = ConfigUtils.hashJSON(oConfig);
                if (originalHash !== newHash) {
                    this._setFrontEndProperty(sConfigPath, "isModified", true);
                    this._setFrontEndProperty(sConfigPath, "isValid", null);
                } else {
                    this._setFrontEndProperty(sConfigPath, "isModified", false);
                    this._setFrontEndProperty(sConfigPath, "isValid", true);
                }
            } else if (!bSaved) {
                this._setFrontEndProperty(sConfigPath, "isModified", true);
                this._setFrontEndProperty(sConfigPath, "isValid", null);
            }
        }
    };

    /**
     * Handler for the press event on the Delete Config Button.
     * Opens a confirmation dialog before publishing the Delete Event.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onDeleteConfig = function (oEvent) {
        var path = this._getMriConfigPathBySourceControl(oEvent.getSource());
        var index = path.replace(this.getView().getBindingContext("analyticsModel").getPath() + "/configs/", "");
        var mriConfig = this._getObjectByPath(path);
        var that = this;

        MessageBox.show(ConfigUtils.getText("MRI_PA_CFG_DELETE_CONFIGURATION_MSG"), {
            icon: MessageBox.Icon.QUESTION,
            title: ConfigUtils.getText("MRI_PA_CFG_DELETE_CONFIGURATION_TITLE"),
            actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
            onClose: function (oAction) {
                if (oAction === MessageBox.Action.DELETE) {
                    if (!mriConfig.frontEndProperties || mriConfig.frontEndProperties.isSaved) {
                        var params = {
                            action: "delete",
                            configId: mriConfig.meta.configId,
                            configVersion: mriConfig.meta.configVersion
                        };
                        ConfigUtils.ajax({
                            url: "/pa-config-svc/services/config.xsjs",
                            type: "POST",
                            dataType: "json",
                            contentType: "application/json;charset=utf-8",
                            data: JSON.stringify(params)
                        }).done(function () {
                            that._removeConfigFromList(index);
                            that._oEventBus.publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_DELETED);
                            ConfigUtils.notifyUser(sap.ui.core.MessageType.Success, "MRI_PA_CFG_DELETE_CONFIG_SUCCESS");
                        }).fail(function (xhr, textStatus, error) {
                            ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_DELETE_CONFIGURATION_FAILED", error);
                        });
                    } else {
                        that._removeConfigFromList(index);
                        that._oEventBus.publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_DELETED);
                        ConfigUtils.notifyUser(sap.ui.core.MessageType.Success, "MRI_PA_CFG_DELETE_CONFIG_SUCCESS");
                    }
                }
            }
        });
    };

    /**
     * Gets the requested MRI config and loads it, if it's not cached.
     * Calls the given Callback with the configuration as a parameter.
     * @param {String} sPath Internal path of the config.
     * @param {Function} callback Callback.
     */
    ConfigListController.prototype.getConfig = function (sPath, callback) {
        var oAnalyticsModel = this.getView().getModel("analyticsModel");
        var mriConfig = this._getObjectByPath(sPath);
        if (!mriConfig.meta) {
            ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ERROR_INVALID_CONFIG");
        } else if (!mriConfig.config) {
            ConfigUtils.ajax({
                url: "/pa-config-svc/services/config.xsjs",
                type: "POST",
                dataType: "json",
                contentType: "application/json;charset=utf-8",
                data: JSON.stringify({
                    action: "getAdminConfig",
                    configId: mriConfig.meta.configId,
                    configVersion: mriConfig.meta.configVersion
                })
            }).done(function (mData) {
                oAnalyticsModel.setProperty(sPath + "/config", mData.config);
                oAnalyticsModel.setProperty(sPath + "/meta", mData.meta);
                this._setFrontEndProperty(sPath, "", ConfigUtils.getFrontEndPropertiesObject(true, mData.config));
                callback(mData);
            }.bind(this)).fail(function () {
                ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ERROR_IN_LOADING");
            });
        } else {
            callback(mriConfig);
        }
    };

    /**
     * Save and activate a given Config
     * @param  {object}   oConfig     MRI Configuration
     * @param  {string}   sConfigPath Path to MRI Configuration in Model
     * @param  {Function} callback    Callback
     */
    ConfigListController.prototype.activateConfig = function (oConfig, sConfigPath, callback) {
        if (this._validateMriConfig(oConfig)) {
            var params = {
                action: "activate",
                configId: oConfig.meta.configId,
                configName: oConfig.meta.configName,
                dependentConfig: oConfig.meta.dependentConfig,
                config: oConfig.config
            };

            ConfigUtils.ajax({
                url: "/pa-config-svc/services/config.xsjs",
                type: "POST",
                dataType: "json",
                contentType: "application/json;charset=utf-8",
                data: JSON.stringify(params)
            }).done(function (oData) {
                var text;
                var type;
                var status;
                if (oData.activated) {
                    if (oData.warnings.length === 0) {
                        text = ConfigUtils.getText("MRI_PA_CFG_SAVE_SUCCESS");
                        type = sap.ui.core.MessageType.Success;
                    } else {
                        text = ConfigUtils.getText("MRI_PA_CFG_VALID_WITH_WARNINGS_CONFIG_MESSAGE");
                        type = sap.ui.core.MessageType.Warning;
                    }
                    this._setFrontEndProperty(sConfigPath, "isSaved", true);
                    this._setFrontEndProperty(sConfigPath, "isModified", false);
                    this._setFrontEndProperty(sConfigPath, "isValid", true);
                    this._setFrontEndProperty(sConfigPath, "originalHash", ConfigUtils.hashJSON(oData.config));
                    this._setFrontEndProperty(sConfigPath, "errors", []);
                    this._setFrontEndProperty(sConfigPath, "warnings", []);
                    this._updateModelForOneMriConfig(sConfigPath, oData);
                    ConfigUtils.notifyUser(type, text);
                    status = "success";
                } else {
                    text = ConfigUtils.getText("MRI_PA_CFG_INVALID_CONFIG_MESSAGE");
                    type = sap.ui.core.MessageType.Error;
                    this._setFrontEndProperty(sConfigPath, "isValid", false);
                    this._setFrontEndProperty(sConfigPath, "errors", oData.errors);
                    this._setFrontEndProperty(sConfigPath, "warnings", oData.warnings);
                    this.showValidationErrors(oConfig.config, sConfigPath);
                    status = "error";
                }
                if (typeof callback === "function") {
                    callback(status);
                }
            }.bind(this)).fail(function (xhr, textStatus, error) {
                ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ADMIN_INVALID_CONFIG", error);
                var status = "error";
                if (typeof callback === "function") {
                    callback(status);
                }
            });
        }
    };
    /**
     * Handler for the press event on the Activate Config Button.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onActivateConfig = function (oEvent) {
        var source = oEvent.getSource();
        this.selectMriConfig(source.getParent().getParent());
        var path = this._getMriConfigPathBySourceControl(source);
        this.getConfig(path, function (mriConfig) {
            this.activateConfig(mriConfig, path);
        }.bind(this));
    };

    /**
     * Handler for the press event on the Duplicate Config Button.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onDuplicateConfiguration = function (oEvent) {
        var that = this;
        var path = this._getMriConfigPathBySourceControl(oEvent.getSource());
        this.getConfig(path, function (srcMriConfig) {
            var dupConfig = that._duplicateConfig(srcMriConfig);

            that.onAddNewMriConfiguration(dupConfig);
        });
    };

    ConfigListController.prototype._duplicateConfig = function (srcMriConfig) {
        var dupConfig = this._getEmptyConfig(srcMriConfig.meta.dependentConfig.configId, srcMriConfig.meta.dependentConfig.configVersion);
        dupConfig.config = ConfigUtils.cloneJson(srcMriConfig.config);
        return dupConfig;
    };

    /**
     * Handler for the press event on the Validate Config Button.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onValidateConfiguration = function (oEvent) {
        var path = this._getMriConfigPathBySourceControl(oEvent.getSource());
        var that = this;
        this.getConfig(path, function (mriConfig) {
            if (that._validateMriConfig(mriConfig)) {
                var params = {
                    action: "validate",
                    config: mriConfig.config,
                    dependentConfig: mriConfig.meta.dependentConfig
                };

                ConfigUtils.ajax({
                    url: "/pa-config-svc/services/config.xsjs",
                    type: "POST",
                    dataType: "json",
                    contentType: "application/json;charset=utf-8",
                    data: JSON.stringify(params)
                }).done(function (oData) {
                    var text;
                    var type;

                    if (oData.valid === true) {
                        if (oData.warnings.length === 0) {
                            text = ConfigUtils.getText("MRI_PA_CFG_VALID_CONFIG_MESSAGE");
                            type = sap.ui.core.MessageType.Success;
                        } else {
                            text = ConfigUtils.getText("MRI_PA_CFG_VALID_WITH_WARNINGS_CONFIG_MESSAGE");
                            type = sap.ui.core.MessageType.Warning;
                        }

                        this._setFrontEndProperty(path, "isValid", true);
                        this._setFrontEndProperty(path, "errors", []);
                        this._setFrontEndProperty(path, "warnings", []);
                        ConfigUtils.notifyUser(type, text);
                    } else {
                        text = ConfigUtils.getText("MRI_PA_CFG_INVALID_CONFIG_MESSAGE");
                        type = sap.ui.core.MessageType.Error;
                        this._setFrontEndProperty(path, "isValid", false);
                        this._setFrontEndProperty(path, "errors", oData.errors);
                        this._setFrontEndProperty(path, "warnings", oData.warnings);
                        this.showValidationErrors(mriConfig.config, path);
                    }
                }.bind(this)).fail(function (xhr, textStatus, error) {
                    ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ADMIN_INVALID_CONFIG", error);
                });
            }
        }.bind(this));
    };

    /**
     * Handler for the press event on the Preview Config Button.
     * Opens a Dialog to show the configuration as JSON.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onPreviewConfigPressed = function (oEvent) {
        var source = oEvent.getSource();
        this.selectMriConfig(source.getParent().getParent());

        if (!this._oConfigPreviewDialog) {
            this._oConfigPreviewDialog = sap.ui.xmlfragment("hc.mri.pa.config.ui.views.PreviewConfig", this);
            this._oConfigPreviewDialog.setModel(this.getView().getModel("i18n"), "i18n");
            this._oConfigPreviewDialog.setModel(new JSONModel(), "previewModel");
        }
        var sPath = this._getMriConfigPathBySourceControl(source);
        this.getConfig(sPath, jQuery.proxy(function (mConfig) {
            if (mConfig.config) {
                this._oConfigPreviewDialog.getModel("previewModel").setData({
                    file: JSON.stringify(mConfig.config, null, 4)
                });
                this._oConfigPreviewDialog.open();
            } else {
                ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ERROR_INVALID_CONFIG");
            }
        }, this));
    };

    /**
     * Handler for the Close Button in the Preview Config Dialog.
     */
    ConfigListController.prototype.onConfigPreviewDialogClose = function () {
        this._oConfigPreviewDialog.close();
    };

    ConfigListController.prototype.onConfigPreviewDialogCopy = function () {
        var configText = this._oConfigPreviewDialog.getContent()[0];
        var textElements = configText.$().find("textarea, input");
        if (textElements.length > 0) {
            textElements[0].select();
            document.execCommand("copy");
        }
    };


    /**
     * Handler for the press event on the import Config button.
     * Creates and opens the Popover at the event source.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onImportConfigurationPressed = function (oEvent) {
        var source = oEvent.getSource();
        this.selectMriConfig(source.getParent().getParent());

        var path = this._getMriConfigPathBySourceControl(source);
        this.onImportConfiguration(path);
    };


    /**
     * import a new configuration to the targetConfigPath
     * @param {string} targetConfigPath if not provided add a new configuration
     */
    ConfigListController.prototype.onImportConfiguration = function (targetConfigPath) {
        if (!this._oImportDialog) {
            this._oImportDialog = sap.ui.xmlfragment("hc.mri.pa.config.ui.views.ImportConfig", this);
            this._oImportDialog.addStyleClass(ConfigUtils.getContentDensityClass());
            this.getView().addDependent(this._oImportDialog);
            var importModel = new JSONModel();
            importModel.setSizeLimit(Infinity);
            this._oImportDialog.setModel(importModel, "importModel");
        }
        var oVersions = this.getView().getBindingContext("analyticsModel").getProperty("versions");
        var activeVersion = ConfigUtils.getActiveOrLatestVersion(oVersions);
        var aSortedVersions = Object.keys(oVersions)
            .map(function (key) {
                return oVersions[key];
            })
            .sort(function (a, b) {
                return parseInt(b.version, 10) - parseInt(a.version, 10);
            });
        this._oImportDialog.getModel("importModel").setData({
            selectedVersion: activeVersion,
            versions: aSortedVersions || [],
            file: "",
            targetConfig: targetConfigPath
        });
        this._oImportDialog.open();
    };

    /**
     * Handler for confirming the import in the import dialog.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onImportConfigVersion = function (oEvent) {
        var oModel = oEvent.getSource().getModel("importModel");
        var sTargetConfigPath = oModel.getProperty("/targetConfig");
        var sDependentConfigId = this.getView().getBindingContext("analyticsModel").getProperty("configId");
        var sDependentConfigVersion = oModel.getProperty("/selectedVersion");

        var mDependentConfig = {
            configId: sDependentConfigId,
            configVersion: sDependentConfigVersion
        };
        var mConfig;
        try {
            mConfig = JSON.parse(oModel.getProperty("/file"));
        } catch (oError) {
            ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_WRONG_IMPORT_FORMAT");
            return;
        }
        if (sTargetConfigPath === null || typeof sTargetConfigPath === "undefined") {
            this._createEmptyMriConfiguration(mDependentConfig.configVersion);
            this._oEventBus.publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_CREATED_VIA_IMPORT, {
                importedConfig: mConfig,
                dependentConfig: mDependentConfig
            });
        } else {
            this._oEventBus.publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_WAS_IMPORTED, {
                importedConfig: mConfig,
                dependentConfig: mDependentConfig
            });
        }
        this._oImportDialog.close();
    };
    /**
     * Handler for canceling the import in the import dialog.
     */
    ConfigListController.prototype.onImportConfigurationCanceled = function () {
        if (this._oImportDialog) {
            this._oImportDialog.close();
        }
    };
    /**
     * Generates a human readable translated description of the error location
     * @param  {object} oConfig MRI config
     * @param  {object} oError  Error description
     * @returns {string}         Human readable translated description of the error location
     */
    ConfigListController.prototype._getErrorLocationDescription = function (oConfig, oError) {
        var aErrorPathParts = oError.path ? oError.path.split(".") : [];
        var aErrorLocationParts = [];

        function getPartText(sTextbundleKey, aParams) {
            return ConfigUtils.getText(sTextbundleKey, aParams);
        }
        function addPart(sTextbundleKey, aParams) {
            aErrorLocationParts.push(getPartText(sTextbundleKey, aParams));
        }

        if (aErrorPathParts.length === 0) {
            addPart("MRI_PA_CFG_ERROR_LOCATION_GENERAL");
        } else if (aErrorPathParts[0] === "configInformations") {
            // Configuration Details
            addPart("MRI_PA_CFG_DETAILS_TITLE");
            if (aErrorPathParts.length > 1 && aErrorPathParts[1] === "note") {
                addPart("MRI_PA_CFG_DETAILS_NOTES");
            }
        } else if (aErrorPathParts[0] === "pageTitle" || aErrorPathParts[0] === "panelOptions") {
            // App Settings
            addPart("MRI_PA_CFG_APP_SETTINGS_TITLE");
            if (aErrorPathParts[0] === "pageTitle") {
                // Page Title
                addPart("MRI_PA_CFG_ATTRIBUTE_PAGE_TITLE");
            } else if (aErrorPathParts.length > 1 && aErrorPathParts[1] === "afp") {
                if (aErrorPathParts.length > 2 && aErrorPathParts[2] === "visible") {
                    // Match "Any" Filter Card Section
                    addPart("MRI_PA_CFG_TITLE_PANEL_TYPES_AFP");
                }
            } else if (aErrorPathParts.length > 1 && aErrorPathParts[1] === "advancedTimeFiltering") {
                if (aErrorPathParts.length > 2 && aErrorPathParts[2] === "useNextInteraction") {
                    // Use Next Interaction Instead of Advanced Time
                    addPart("MRI_PA_CFG_TITLE_ADVANCED_TIME_FILTER");
                }
            } else if (aErrorPathParts.length > 1 && aErrorPathParts[1] === "absoluteTimeFiltering") {
                if (aErrorPathParts.length > 2 && aErrorPathParts[2] === "absoluteTimeEnabled") {
                    // Use Next Interaction Instead of Advanced Time
                    addPart("MRI_PA_CFG_TITLE_ABSOLUTE_TIME_FILTER");
                }
            } else if (aErrorPathParts.length > 1 && aErrorPathParts[1] === "noValueText") {
                if (aErrorPathParts.length > 2 && aErrorPathParts[2] === "customizedNoValueText") {
                    // Use Next Interaction Instead of Advanced Time
                    addPart("MRI_PA_CFG_TITLE_CUSTOM_NO_VALUE");
                }
            }
        } else if (aErrorPathParts[0] === "chartOptions") {
            // Charts
            addPart("MRI_PA_CFG_CHARTS_TITLE");
            if (aErrorPathParts.length > 1) {
                if (aErrorPathParts[1] === "boxplot") {
                    addPart("MRI_PA_CFG_TITLE_CHART_TYPES_BOXPLOT");
                } else if (aErrorPathParts[1] === "initialAttributes") {
                    if (aErrorPathParts.length > 2) {
                        if (aErrorPathParts[2] === "categories") {
                            addPart("MRI_PA_CFG_CHARTS_INITIAL_CATEGORIES");
                        } else if (aErrorPathParts[2] === "measures") {
                            addPart("MRI_PA_CFG_CHARTS_INITIAL_MEASURES");
                        }
                    }
                } else if (aErrorPathParts[1] === "initialChart") {
                    addPart("MRI_PA_CFG_TITLE_INITIAL_CHART");
                } else if (aErrorPathParts[1] === "km") {
                    addPart("MRI_PA_CFG_TITLE_CHART_TYPES_KM");
                } else if (aErrorPathParts[1] === "list") {
                    addPart("MRI_PA_CFG_TITLE_CHART_TYPES_PATIENT_LIST");
                    if (aErrorPathParts.length > 2) {
                        if (aErrorPathParts[2] === "pageSize") {
                            addPart("MRI_PA_CFG_TITLE_PAGE_SIZE");
                        }
                    }
                } else if (aErrorPathParts[1] === "minCohortSize") {
                    addPart("MRI_PA_CFG_TITLE_MIN_COHORT_SIZE");
                } else if (aErrorPathParts[1] === "stacked") {
                    addPart("MRI_PA_CFG_TITLE_CHART_TYPES_BAR_CHART");
                }
            }
        } else if (aErrorPathParts[0] === "filtercards") {
            // Filter Cards || Patient List (will be set in the end)
            var sScope = "filtercard"; // will be set to patientlist where applicable

            var oConfigObj = oConfig.filtercards;
            if (aErrorPathParts.length > 1) {
                oConfigObj = oConfigObj[aErrorPathParts[1]];
                var sModelName = oConfigObj.modelName;
                if (sModelName === "MRI_PA_SERVICES_FILTERCARD_TITLE_BASIC_DATA") {
                    sModelName = ConfigUtils.getText(sModelName);
                } 
                if (sModelName) {
                    addPart("MRI_PA_CFG_ERROR_LOCATION_FILTERCARD_NAME", sModelName);
                } else {
                    addPart("MRI_PA_CFG_ERROR_LOCATION_FILTERCARD_REF", aErrorPathParts[1]);
                }

                if (aErrorPathParts.length > 3) {
                    oConfigObj = oConfigObj.attributes[aErrorPathParts[3]];
                    if (oConfigObj.modelName) {
                        addPart("MRI_PA_CFG_ERROR_LOCATION_FILTERCARD_ATTRIBUTE_NAME", oConfigObj.modelName);
                    } else {
                        addPart("MRI_PA_CFG_ERROR_LOCATION_FILTERCARD_ATTRIBUTE_REF", aErrorPathParts[3]);
                    }
                    if (aErrorPathParts.length > 4 && aErrorPathParts[4] === "patientlist") {
                        sScope = "patientlist";
                    }
                }
            }
            if (sScope === "filtercard") {
                aErrorLocationParts.unshift(getPartText("MRI_PA_CFG_FILTER_CARDS_TITLE"));
            } else {
                aErrorLocationParts.unshift(getPartText("MRI_PA_CFG_PATIENT_LIST_TITLE"));
            }
        } else {
            // should not happen
            addPart("MRI_PA_CFG_ERROR_LOCATION_GENERAL");
        }

        var sErrorLocation = "";
        if (aErrorLocationParts.length > 0) {
            sErrorLocation += aErrorLocationParts[0];
            for (var i = 1; i < aErrorLocationParts.length; i++) {
                // sErrorLocation = ConfigUtils.getText("MRI_PA_CFG_ERROR_LOCATION_SEPARATOR", [sErrorLocation, aErrorLocationParts[i]]);
                // TEW escapes the encoded string. Hardcoding the value for now
                sErrorLocation = sErrorLocation + " → " + aErrorLocationParts[i];
            }
        }
        sErrorLocation = ConfigUtils.getText("MRI_PA_CFG_ERROR_LOCATION_FORMATTER", [sErrorLocation]);

        return sErrorLocation;
    };

    /**
     * Format the error messages and open the config validation error dialog.
     * @param  {object} oConfig     MRI config
     * @param  {string} sConfigPath Path to active MRI config
     */
    ConfigListController.prototype.showValidationErrors = function (oConfig, sConfigPath) {
        var aErrors = this._getFrontEndProperty(sConfigPath, "errors");
        var aWarnings = this._getFrontEndProperty(sConfigPath, "warnings");

        aErrors = aErrors.map(function (mError, iIndex) {
            return {
                index: iIndex + 1,
                location: this._getErrorLocationDescription(oConfig, mError),
                message: ConfigUtils.getText(mError.messageKey, mError.values)
            };
        }, this);

        aWarnings = aWarnings.map(function (mWarning, iIndex) {
            return {
                index: iIndex + 1,
                location: this._getErrorLocationDescription(oConfig, mWarning),
                message: ConfigUtils.getText(mWarning.messageKey, mWarning.values)
            };
        }, this);

        if (!this._oConfigValidationErrorDialog) {
            this._oConfigValidationErrorDialog = sap.ui.xmlfragment("hc.mri.pa.config.ui.views.ConfigValidationErrors", this);
            this._oConfigValidationErrorDialog.setModel(new JSONModel(), "errorModel");
            this.getView().addDependent(this._oConfigValidationErrorDialog);
        }
        this._oConfigValidationErrorDialog.getModel("errorModel").setData({
            errors: aErrors,
            warnings: aWarnings,
            state: aErrors.length ? sap.ui.core.ValueState.Error : sap.ui.core.ValueState.Warning
        });
        this._oConfigValidationErrorDialog.open();
    };

    /**
     * Handler for the Close Button in the Config Validation Error Dialog.
     */
    ConfigListController.prototype.onConfigValidationErrorDialogClose = function () {
        this._oConfigValidationErrorDialog.close();
    };

    ConfigListController.prototype.onShowValidationErrors = function (oEvent) {
        var source = oEvent.getSource();

        var path = this._getMriConfigPathBySourceControl(source);
        this.getConfig(path, function (mriConfig) {
            this.showValidationErrors(mriConfig.config, path);
        }.bind(this));
    };

    /**
     * Handling adding an empty MRI config to the list
     * @param {string} dataModelVersion Datamodel version
     */
    ConfigListController.prototype.onAddEmptyMriConfiguration = function (dataModelVersion) {
        this._createEmptyMriConfiguration(dataModelVersion);
        this._oEventBus.publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_CREATED);
    };
    /**
     * Handling adding an empty MRI config to the list.
     * @private
     * @param {string} dataModelVersion Datamodel configuration version
     */
    ConfigListController.prototype._createEmptyMriConfiguration = function (dataModelVersion) {
        var oBindingContext = this.getView().getBindingContext("analyticsModel");
        var model = this.getView().getModel("analyticsModel");
        var path = oBindingContext.getPath();
        var dmConfig = model.getProperty(path);

        if (!dataModelVersion) {
            dataModelVersion = ConfigUtils.getActiveOrLatestVersion(dmConfig.versions);
        }

        var addedMriConfig = this._getEmptyConfig(dmConfig.configId, dataModelVersion);

        this.onAddNewMriConfiguration(addedMriConfig);
    };

    /**
     * Handling adding a new MRI config to the list
     * @param {object} oNewMriConfig New configuration object
     */
    ConfigListController.prototype.onAddNewMriConfiguration = function (oNewMriConfig) {
        var oBindingContext = this.getView().getBindingContext("analyticsModel");
        var model = this.getView().getModel("analyticsModel");
        var path = oBindingContext.getPath();

        // add a new item to the list
        var mriConfigList = model.getProperty(path + "/configs");
        mriConfigList.push(oNewMriConfig);
        model.setProperty(path + "/configs", mriConfigList);

        // fire the press event to choose the newly added item
        var newItem = this._mriConfigList.getItems()[mriConfigList.length - 1];
        this._mriConfigList.fireItemPress({
            listItem: newItem,
            srcControl: this._mriConfigList
        });

        sap.ui.getCore().getEventBus().publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_UPDATE_FINISHED);
    };

    ConfigListController.prototype._getEmptyConfig = function (dmConfigId, dmConfigVersion) {
        var config = {
            meta: {
                configId: "",
                configName: "",
                configVersion: "",
                creator: "",
                created: "",
                modifier: "",
                modified: "",
                dependentConfig: {
                    configId: dmConfigId,
                    configVersion: dmConfigVersion
                }
            },
            frontEndProperties: ConfigUtils.getFrontEndPropertiesObject(false)
        };
        return config;
    };

    ConfigListController.prototype._getMriConfigPathBySourceControl = function (oSource) {
        var oBindingContext = oSource.getBindingContext("analyticsModel");

        return oBindingContext.getPath();
    };

    ConfigListController.prototype._getObjectByPath = function (path) {
        return this.getView().getModel("analyticsModel").getProperty(path);
    };

    ConfigListController.prototype._getMriConfigList = function () {
        var oBindingContext = this.getView().getBindingContext("analyticsModel");
        var path = oBindingContext.getPath();
        return this.getView().getModel("analyticsModel").getProperty(path + "/configs");
    };


    /**
     * Set a frontend property
     * @private
     * @param   {string}  sConfigPath  Path to the config in the model
     * @param   {string}  sProperty    Property name
     * @param   {any}  vValue          Value
     */
    ConfigListController.prototype._setFrontEndProperty = function (sConfigPath, sProperty, vValue) {
        var oModel = this.getView().getModel("analyticsModel");
        var oContext = oModel.getContext(sConfigPath);
        sProperty = "frontEndProperties" + (sProperty ? "/" + sProperty : "");
        oModel.setProperty(sProperty, vValue, oContext);
    };

    /**
     * Get a frontend property
     * @private
     * @param   {string}  sConfigPath  Path to the config in the model
     * @param   {string}  sProperty    Property name
     * @returns {any}                  Value
     */
    ConfigListController.prototype._getFrontEndProperty = function (sConfigPath, sProperty) {
        var oModel = this.getView().getModel("analyticsModel");
        var oContext = oModel.getContext(sConfigPath);
        sProperty = "frontEndProperties" + (sProperty ? "/" + sProperty : "");
        return oContext.getProperty(sProperty);
    };


    ConfigListController.prototype._validateMriConfig = function (mriConfig) {
        // TODO consider adding more validations
        if (!mriConfig || !mriConfig.meta) {
            ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ERROR_INVALID_CONFIG");
            return false;
        }
        if (!mriConfig.config) {
            ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ERROR_INVALID_CONFIG_NO_VERSION");
            return false;
        }
        if (!mriConfig.meta.configName) {
            ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ERROR_INVALID_CONFIG_NO_NAME");
            return false;
        }
        if (!mriConfig.meta.dependentConfig || !mriConfig.meta.dependentConfig.configVersion) {
            ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ERROR_INVALID_CONFIG_NO_VERSION");
            return false;
        }
        return true;
    };

    ConfigListController.prototype._updateModelForOneMriConfig = function (path, mriConfig) {
        var model = this.getView().getModel("analyticsModel");
        var parentPath = this.getView().getBindingContext("analyticsModel").getPath();

        if (mriConfig.meta) {
            model.setProperty(path + "/meta", mriConfig.meta);
        }
        if (mriConfig.config) {
            model.setProperty(path + "/config", mriConfig.config);
        }
        if (mriConfig.frontEndProperties) {
            model.setProperty(path + "/frontEndProperties", mriConfig.frontEndProperties);
        }
        this._oEventBus.publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_CHANGED, {
            path: path,
            parentPath: parentPath
        });
        sap.ui.getCore().getEventBus().publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_UPDATE_FINISHED);
    };

    ConfigListController.prototype._removeConfigFromList = function (indexInList) {
        if (indexInList < 0) {
            return;
        }
        var configList = this._getMriConfigList();
        configList.splice(indexInList, 1);

        var path = this.getView().getBindingContext("analyticsModel").getPath();
        this.getView().getModel("analyticsModel").setProperty(path + "/configs", configList);
    };

    /**
     * Handler for the press event on the export Config button.
     * @param {sap.ui.base.Event} oEvent SAPUI5 Press Event
     */
    ConfigListController.prototype.onExportConfigurationPressed = function (oEvent) {
        var source = oEvent.getSource();

        var path = this._getMriConfigPathBySourceControl(source);
        this.getConfig(path, function (mriConfig) {
            var bModified = this._getFrontEndProperty(path, "isModified");
            var bSaved = this._getFrontEndProperty(path, "isSaved");

            if (bSaved && !bModified) {
                this.exportConfiguration(path);
            } else {
                if (!this._oExportDialog) {
                    this._oExportDialog = sap.ui.xmlfragment("hc.mri.pa.config.ui.views.ExportConfig", this);
                    this._oExportDialog.addStyleClass(ConfigUtils.getContentDensityClass());
                    this.getView().addDependent(this._oExportDialog);
                    this._oExportDialog.setModel(new JSONModel(), "exportModel");
                }

                this._oExportDialog.getModel("exportModel").setData({
                    config: mriConfig,
                    configPath: path
                });
                this._oExportDialog.open();
            }
        }.bind(this));
    };

    ConfigListController.prototype.onExportConfigurationWithSave = function (oEvent) {
        this._oExportDialog.close();
        var oSource = oEvent.getSource();
        var oModel = oSource.getModel("exportModel");

        var oConfig = oModel.getProperty("/config");
        var sConfigPath = oModel.getProperty("/configPath");
        this.activateConfig(oConfig, sConfigPath, function (status) {
            if (status === "success") {
                this.exportConfiguration(sConfigPath);
            }
        }.bind(this));
    };
    ConfigListController.prototype.onExportConfigurationCanceled = function () {
        this._oExportDialog.close();
    };

    /**
     * Export a stored configuration.
     * @param {string} sConfigPath Path to the config in the model
     */
    ConfigListController.prototype.exportConfiguration = function (sConfigPath) {
        var oModel = this.getView().getModel("analyticsModel");
        var oContext = oModel.getContext(sConfigPath);
        var meta = {
            configId: oContext.getProperty("meta/configId"),
            configVersion: oContext.getProperty("meta/configVersion")
        };

        var url = this._getConfigDownloadLink(meta);
        ConfigUtils.ajax({
            url: url,
            type: "GET",
        }).done(function (mData) {

            var configData = encodeURIComponent(mData);
            if(window.navigator.msSaveOrOpenBlob) {
                var blob = new Blob([mData], {type: 'application/json'});
                window.navigator.msSaveBlob(blob, "PatientAnalyticsConfig.json");
            } else {
                var xDocument = this.getView().getDomRef().ownerDocument;
                var xDownloadLink = xDocument.createElement("a");
                xDownloadLink.href = "data:application/json;charset=utf-8," + configData;
                xDownloadLink.download = "PatientAnalyticsConfig.json";
                xDocument.body.appendChild(xDownloadLink);
                xDownloadLink.click();
                xDocument.body.removeChild(xDownloadLink);
            }

        }.bind(this)).fail(function () {
            ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ERROR_IN_LOADING");
        });
    };
    /**
     * Export the given configuration.
     * @param {object}   meta     Configuration meta information with configId and configVersion
     * @returns {string}          Config download link
     */
    ConfigListController.prototype._getConfigDownloadLink = function (meta) {
        var url = "/pa-config-svc/services/config.xsjs";
        url += "?action=export";
        url += "&configId=" + meta.configId;
        url += "&configVersion=" + meta.configVersion;
        return url;
    };

    /**
     * Formatter for the configuration state (New/Saved/Modified)
     * @param   {boolean}  bSaved       Whether the configuration has been saved
     * @param   {boolean}  bModified    Whether the configuration has been modified
     * @returns {string}                Message in the users language
     */
    ConfigListController.prototype.stateFormatter = function (bSaved, bModified) {
        if (!bSaved) {
            return ConfigUtils.getText("MRI_PA_CFG_STATUS_NEW");
        } else if (!bModified) {
            return ConfigUtils.getText("MRI_PA_CFG_STATUS_SAVED");
        } else {
            return ConfigUtils.getText("MRI_PA_CFG_STATUS_CHANGES_PENDING");
        }
    };

    return ConfigListController;
});
