sap.ui.define(
  [
    "jquery.sap.global",
    "hc/hph/core/ui/JSONBinding/DeepJSONPropertyBinding",
    "hc/hph/patient/config/ui/lib/BackendLinker",
    "hc/hph/patient/config/ui/lib/ConfigUtils",
    "sap/m/MessageBox",
    "sap/ui/core/LocaleData",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
  ],
  function (
    jQuery,
    DeepJSONPropertyBinding,
    BackendLinker,
    ConfigUtils,
    MessageBox,
    LocaleData,
    Controller,
    JSONModel
  ) {
    "use strict";

    /**
     * Constructor for the ConfigList Controller.
     * @constructor
     *
     * @classdesc
     * Controller for the config list in the master page of the split layout.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.hph.patient.config.ui.views.ConfigList
     */
    var ConfigListController = Controller.extend("hc.hph.patient.config.ui.views.ConfigList", {
      metadata: {
        events: {
          /**
           * Requests the busy state of the application to be updated.
           */
          busyStateChangeRequested: {
            parameters: {
              state: {
                type: "boolean",
              },
            },
          },
        },
      },
    });

    /**
     * This method is called upon initialization of the View.
     * @protected
     * @override
     */
    ConfigListController.prototype.onInit = function () {
      this._oEventBus = sap.ui.getCore().getEventBus();
      this._piConfigList = this.byId("psConfigList");
    };

    /**
     * @typedef {Object} FrontEndProperties
     * @property {boolean} [isSaved=false] True if this config been saved
     * @property {boolean} [isModified=false] True if this config been modified
     * @property {boolean} [isValid=null] True/False if this config is valid/invalid; Null if unknown.
     * @property {number} [originalHash=null] Hash of the stored config; Null if unknown.
     * @property {object} patientlistorder Patientlist order store
     * @property {array} patientlistorder.columns Order of the columns in the patientlist
     * @property {array} errors Validation errors
     * @property {array} warnings Validation warnings
     */

    /**
     * Get the frontend properties.
     * @private
     * @param   {boolean} isSaved Whether the configuration has been saved
     * @returns {FrontEndProperties}  Object of frontend properties.
     */
    ConfigListController.prototype._getFrontEndPropertiesObject = function (isSaved) {
      return {
        isSaved: isSaved || false,
        isModified: false,
        isValid: null,
        originalHash: null,
        patientlistorder: {
          columns: [],
        },
        errors: [],
        warnings: [],
      };
    };

    /**
     * Set the path to the currently displayed configuration
     * @private
     * @param   {string}  sConfigPath  Path to the current config in the model.
     */
    ConfigListController.prototype._setCurrentConfigPath = function (sConfigPath) {
      var oModel = this.getView().getModel("dynamicBindingsModel");
      oModel.setProperty("/selectedPatientConfig", sConfigPath);
    };

    /**
     * Get the path to the currently displayed configuration
     * @private
     * @returns   {string}  Path to the current config in the model.
     */
    ConfigListController.prototype._getCurrentConfigPath = function () {
      var oModel = this.getView().getModel("dynamicBindingsModel");
      return oModel.getProperty("/selectedPatientConfig");
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
     * Handler for changing the selected configuration.
     * Updates event listeners.
     */
    ConfigListController.prototype.onConfigSwitched = function () {
      // If the last PS config for the current cdm config got deleted, the selected config is unset
      if (this._getCurrentConfigPath()) {
        this._attachConfigModified();
      }
    };

    /**
     * Attach event handler to the config model listening on config modifications
     * @private
     */
    ConfigListController.prototype._attachConfigModified = function () {
      var oAnalyticsModel = this.getView().getModel("analyticsModel");
      var sConfigPath = this._getCurrentConfigPath();

      var oContext = oAnalyticsModel.getContext(sConfigPath + "/config");
      if (this.changeBinding) {
        this.changeBinding.setContext(oContext);
      } else {
        this.changeBinding = new DeepJSONPropertyBinding(oAnalyticsModel, "", oContext);
        this.changeBinding.attachChange(this.onConfigModified, this);
      }
    };

    /**
     * Attach event handler to listen on config selection changes
     * @private
     */
    ConfigListController.prototype._attachConfigSwitched = function () {
      var oDynamicBindingsModel = this.getView().getModel("dynamicBindingsModel");

      var oSelectedConfigBinding = new sap.ui.model.Binding(
        oDynamicBindingsModel,
        "/selectedPatientConfig",
        oDynamicBindingsModel.getContext("/")
      );
      // detach first to avoid double binding
      oSelectedConfigBinding.detachChange(this.onConfigSwitched, this);

      oSelectedConfigBinding.attachChange(this.onConfigSwitched, this);
    };
    /**
     * executes an async function with given parameters and sets the UI in a busy sate in the meanwhile.
     * @param  {function} fnAction    Async function to be called
     * @param  {object} oContext      Context of the async function
     * @param  {array}  aParameters   Parameters for the async call
     * @param  {function} fnCallback  Callback to be called, after busy state has been reset
     */
    ConfigListController.prototype.executeAsyncBusy = function (fnAction, oContext, aParameters, fnCallback) {
      this.fireEvent("busyStateChangeRequested", { state: true });
      try {
        fnAction.apply(
          oContext,
          aParameters.concat([
            function () {
              this.fireEvent("busyStateChangeRequested", { state: false });
              fnCallback.apply(this, arguments);
            }.bind(this),
          ])
        );
      } catch (e) {
        this.fireEvent("busyStateChangeRequested", { state: false });
        throw new Error(e.message);
      }
    };

    /**
     * Load the Patient Summary configuration
     * @private
     * @param   {string}   sConfigPath  Path to the config in the model
     * @param   {function} callback     Callback which will be called after loading the config successfully.
     */
    ConfigListController.prototype._loadConfigFromDB = function (sConfigPath, callback) {
      var oModel = this.getView().getModel("analyticsModel");
      var oContext = oModel.getContext(sConfigPath);
      var oMeta = oModel.getProperty("meta", oContext);
      this.executeAsyncBusy(BackendLinker.getConfig, BackendLinker, [oMeta], function (sState, oData) {
        if (sState === "success") {
          var configHash = ConfigUtils.hashJSON(oData.config);
          oModel.setProperty("config", oData.config, oContext);
          oModel.setProperty("meta", oData.meta, oContext);
          this._setFrontEndProperty(sConfigPath, "originalHash", configHash);
          this._setFrontEndProperty(sConfigPath, "isValid", true);
          this._setFrontEndProperty(sConfigPath, "isSaved", true);
          this._setFrontEndProperty(sConfigPath, "isModified", false);
          var oConfig = oModel.getProperty("", oContext);
          callback(oConfig);
        } else {
          ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "HPH_PAT_CFG_CONFIG_ERROR_IN_LOADING");
        }
      });
    };

    /**
     * Changes the current config and ensures it is loaded
     * @private
     * @param   {string}   sConfigPath  Path to the config in the model
     * @param   {function} callback     Callback which will be called after loading the config successfully.
     */
    ConfigListController.prototype._loadPSConfig = function (sConfigPath, callback) {
      this._setCurrentConfigPath(sConfigPath);
      var oConfig = this.getView().getModel("analyticsModel").getProperty(sConfigPath);
      if (oConfig.config) {
        if (typeof callback === "function") {
          callback(sConfigPath, oConfig);
        }
      } else {
        this._loadConfigFromDB(sConfigPath, function (config) {
          if (typeof callback === "function") {
            callback(sConfigPath, config);
          }
        });
      }
    };

    /**
     * Handler for the event of the Edit Config.
     * Should load the relevant application config on the right side
     * @param {sap.ui.base.Event} oEvent CustomListItem press Event
     */
    ConfigListController.prototype.onChoosePSConfig = function (oEvent) {
      var listItem = oEvent.getParameter("listItem");
      var path = listItem.getBindingContext("analyticsModel").getPath();
      this._loadPSConfig(path);
    };

    /**
     * Find the parent which represents the config in the list.
     * @param   {object} oElement Element within a config list element
     * @returns {object}          Config list element (`null` if not found)
     */
    ConfigListController.prototype._getConfigListElement = function (oElement) {
      var sElementBindingPath = oElement.getBindingContext("analyticsModel").getPath();
      var aMatchingConfigListElements = this._piConfigList.getItems().filter(function (oConfigListElement) {
        var sConfigListElementPath = oConfigListElement.getBindingContext("analyticsModel").getPath();
        return sElementBindingPath.indexOf(sConfigListElementPath) === 0;
      });
      // There should always be exactly one.
      if (aMatchingConfigListElements.length === 1) {
        return aMatchingConfigListElements[0];
      }
      return null;
    };

    /**
     * Method to trigger the select event in the config list. Used by the activate, delete, preview and duplicate buttons
     * @param {sap.ui.base.Event} oEvent    button press Event
     * @param {function}          callback  function to execute once the press event of the listItem is triggered
     */
    ConfigListController.prototype.performAction = function (oEvent, callback) {
      var listItem = this._getConfigListElement(oEvent.getSource());
      var path = oEvent.getSource().getBindingContext("analyticsModel").getPath();
      listItem.setSelected(true);
      this._loadPSConfig(
        path,
        function (sConfigPath, oConfig) {
          if (typeof callback === "function") {
            callback.call(this, oConfig, sConfigPath);
          }
        }.bind(this)
      );
    };

    /*
     * Formatter
     */

    /**
     * Formatter for the configuration state (New/Saved/Modified)
     * @param   {boolean}  bSaved       Whether the configuration has been saved
     * @param   {boolean}  bModified    Whether the configuration has been modified
     * @returns {string}                Message in the users language
     */
    ConfigListController.prototype.stateFormatter = function (bSaved, bModified) {
      if (!bSaved) {
        return ConfigUtils.getText("HPH_PAT_CFG_STATUS_NEW");
      } else if (!bModified) {
        return ConfigUtils.getText("HPH_PAT_CFG_STATUS_SAVED");
      } else {
        return ConfigUtils.getText("HPH_PAT_CFG_STATUS_CHANGES_PENDING");
      }
    };

    /**
     * Formatter for the configuration valid check state (Valid/Unknown/Invalid)
     * @param   {boolean}  bValid       Whether the configuration has been validated successfully, null if unknown.
     * @returns {string}                Message in the users language
     */
    ConfigListController.prototype.validityFormatter = function (bValid) {
      if (bValid) {
        return ConfigUtils.getText("HPH_PAT_CFG_STATUS_VALID");
      } else if (bValid === null) {
        return ConfigUtils.getText("HPH_PAT_CFG_STATUS_UNKNOWN");
      } else {
        return ConfigUtils.getText("HPH_PAT_CFG_STATUS_INVALID");
      }
    };

    /**
     * Bind data to the "dynamicBindingsModel".
     * @private
     * @param {sap.ui.model.json.JSONModel} oBindingModel "dynamicBindingsModel" Model
     */
    ConfigListController.prototype._bindToDynamicModel = function (oBindingModel) {
      var oRootContext = oBindingModel.getContext("/");

      oBindingModel.bindProperty("selectedDmConfig", oRootContext).attachChange(function (oEvent) {
        var sPath = "/dmConfigList/" + oEvent.getSource().getValue();
        this.getView().bindContext("analyticsModel>" + sPath);
        // add frontend properties to configs, if they don't have them yet
        var oModel = this.getView().getModel("analyticsModel");
        var aConfigs = oModel.getProperty(sPath + "/configs");
        aConfigs.forEach(function (oConfig, index) {
          var sConfigPath = sPath + "/configs/" + index;
          var frontEndProperties = this._getFrontEndProperty(sConfigPath, "");
          if (!frontEndProperties) {
            frontEndProperties = this._getFrontEndPropertiesObject(true);
            this._setFrontEndProperty(sConfigPath, "", frontEndProperties);
            this._setFrontEndProperty(sConfigPath, "isValid", true);
          }
        }, this);
        if (aConfigs.length > 0) {
          var sFirstConfigPath = sPath + "/configs/0";
          this._loadPSConfig(
            sFirstConfigPath,
            function () {
              this._attachConfigModified();
            }.bind(this)
          );
        }
        this._attachConfigSwitched();
      }, this);
    };

    /**
     * Format the error messages and open the config validation error dialog.
     * @param  {object} oConfig     Patient summary config
     * @param  {string} sConfigPath Path to active patient summary config
     */
    ConfigListController.prototype.showValidationErrors = function (oConfig, sConfigPath) {
      var aErrors = this._getFrontEndProperty(sConfigPath, "errors");
      var aWarnings = this._getFrontEndProperty(sConfigPath, "warnings");

      aErrors = aErrors.map(function (mError, iIndex) {
        return {
          index: iIndex + 1,
          location: this._getErrorLocationDescription(oConfig, mError),
          message: ConfigUtils.getText(mError.messageKey, mError.values),
        };
      }, this);

      aWarnings = aWarnings.map(function (mWarning, iIndex) {
        return {
          index: iIndex + 1,
          location: this._getErrorLocationDescription(oConfig, mWarning),
          message: ConfigUtils.getText(mWarning.messageKey, mWarning.values),
        };
      }, this);

      if (!this._oConfigValidationErrorDialog) {
        this._oConfigValidationErrorDialog = sap.ui.xmlfragment(
          "hc.hph.patient.config.ui.views.ConfigValidationErrors",
          this
        );
        this._oConfigValidationErrorDialog.setModel(new JSONModel(), "errorModel");
        this.getView().addDependent(this._oConfigValidationErrorDialog);
      }
      this._oConfigValidationErrorDialog.getModel("errorModel").setData({
        errors: aErrors,
        warnings: aWarnings,
        state: aErrors.length ? sap.ui.core.ValueState.Error : sap.ui.core.ValueState.Warning,
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
      this.performAction(oEvent, function (piConfig, sConfigPath) {
        this.showValidationErrors(piConfig.config, sConfigPath);
      });
    };
    /**
     * Handler for the press event on the Delete Config Button.
     * Opens a confirmation dialog before publishing the Delete Event.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onDeleteConfig = function (oEvent) {
      this.performAction(oEvent, function (piConfig, sConfigPath) {
        var index = sConfigPath.replace(this.getView().getBindingContext("analyticsModel").getPath() + "/configs/", "");
        var that = this;

        MessageBox.show(ConfigUtils.getText("HPH_PAT_CFG_DELETE_CONFIGURATION_MSG"), {
          icon: MessageBox.Icon.QUESTION,
          title: ConfigUtils.getText("HPH_PAT_CFG_DELETE_CONFIGURATION_TITLE"),
          actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
          onClose: function (oAction) {
            if (oAction === MessageBox.Action.DELETE) {
              if (that._getFrontEndProperty(sConfigPath, "isSaved")) {
                var meta = {
                  configId: piConfig.meta.configId,
                  configVersion: piConfig.meta.configVersion,
                };
                this.executeAsyncBusy(BackendLinker.deleteConfig, BackendLinker, [meta], function (status, vData) {
                  if (status === "success") {
                    that._removeConfigFromList(index);
                    ConfigUtils.notifyUser(sap.ui.core.MessageType.Success, "HPH_PAT_CFG_DELETE_CONFIG_SUCCESS");
                  } else {
                    ConfigUtils.notifyUser(
                      sap.ui.core.MessageType.Error,
                      "HPH_PAT_CFG_DELETE_CONFIGURATION_FAILED",
                      vData
                    );
                  }
                });
              } else {
                that._removeConfigFromList(index);
              }
            }
          }.bind(this),
        });
      });
    };

    /**
     * Handler for the press event on the Activate Config Button.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onActivateConfig = function (oEvent) {
      this.performAction(oEvent, this.activateConfig);
    };

    ConfigListController.prototype.activateConfig = function (oConfig, sConfigPath, callback) {
      if (this._validatePiConfig(oConfig)) {
        this._orderLanes(oConfig);
        var meta = {
          configId: oConfig.meta.configId,
          configName: oConfig.meta.configName,
          dependentConfig: oConfig.meta.dependentConfig,
        };
        this.executeAsyncBusy(
          BackendLinker.activateConfig,
          BackendLinker,
          [oConfig.config, meta],
          function (status, oData) {
            var text;
            var type;
            if (status === "success") {
              if (oData.activated) {
                if (oData.warnings.length === 0) {
                  text = ConfigUtils.getText("HPH_PAT_CFG_SAVE_SUCCESS");
                  type = sap.ui.core.MessageType.Success;
                } else {
                  text = ConfigUtils.getText("HPH_PAT_CFG_VALID_WITH_WARNINGS_CONFIG_MESSAGE");
                  type = sap.ui.core.MessageType.Warning;
                }

                this._setFrontEndProperty(sConfigPath, "isSaved", true);
                this._setFrontEndProperty(sConfigPath, "isModified", false);
                this._setFrontEndProperty(sConfigPath, "isValid", true);
                this._setFrontEndProperty(sConfigPath, "originalHash", ConfigUtils.hashJSON(oData.config));
                this._setFrontEndProperty(sConfigPath, "errors", []);
                this._setFrontEndProperty(sConfigPath, "warnings", []);
                this._updateModelForOnePiConfig(sConfigPath, oData);
                ConfigUtils.notifyUser(type, text);
              } else {
                text = ConfigUtils.getText("HPH_PAT_CFG_INVALID_CONFIG");
                type = sap.ui.core.MessageType.Error;
                this._setFrontEndProperty(sConfigPath, "isValid", false);
                this._setFrontEndProperty(sConfigPath, "errors", oData.errors);
                this._setFrontEndProperty(sConfigPath, "warnings", oData.warnings);
                this.showValidationErrors(oConfig.config, sConfigPath);
              }
              status = oData.activated ? status : "error";
            } else {
              text = ConfigUtils.getText("HPH_PAT_CFG_INVALID_CONFIG");
              type = sap.ui.core.MessageType.Error;
              ConfigUtils.notifyUser(type, text, oData);
            }
            this._attachConfigModified();
            if (typeof callback === "function") {
              callback(status);
            }
          }.bind(this)
        );
      }
    };

    /**
     * Handler for the press event on the Duplicate Config Button.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onDuplicateConfiguration = function (oEvent) {
      this.performAction(oEvent, function (srcPiConfig) {
        this._getEmptyConfig(
          srcPiConfig.meta.dependentConfig.configId,
          srcPiConfig.meta.dependentConfig.configVersion,
          function (dupConfig) {
            dupConfig.config = ConfigUtils.cloneJson(srcPiConfig.config);

            this.onAddNewPSConfiguration(dupConfig);
          }.bind(this)
        );
      });
    };

    /**
     * Handler for the press event on the Validate Config Button.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onValidateConfiguration = function (oEvent) {
      this.performAction(oEvent, function (piConfig, sConfigPath) {
        if (this._validatePiConfig(piConfig)) {
          this._orderLanes(piConfig);
          var meta = {
            dependentConfig: piConfig.meta.dependentConfig,
          };

          this.executeAsyncBusy(
            BackendLinker.validateConfig,
            BackendLinker,
            [piConfig.config, meta],
            function (status, oData) {
              var text;
              var type;
              if (status === "success") {
                if (oData.valid === true) {
                  if (oData.warnings.length === 0) {
                    text = ConfigUtils.getText("HPH_PAT_CFG_VALID_CONFIG_MESSAGE");
                    type = sap.ui.core.MessageType.Success;
                  } else {
                    text = ConfigUtils.getText("HPH_PAT_CFG_VALID_WITH_WARNINGS_CONFIG_MESSAGE");
                    type = sap.ui.core.MessageType.Warning;
                  }
                  this._setFrontEndProperty(sConfigPath, "isValid", true);
                  this._setFrontEndProperty(sConfigPath, "errors", []);
                  this._setFrontEndProperty(sConfigPath, "warnings", []);
                  ConfigUtils.notifyUser(type, text);
                } else {
                  text = ConfigUtils.getText("HPH_PAT_CFG_INVALID_CONFIG");
                  type = sap.ui.core.MessageType.Error;
                  this._setFrontEndProperty(sConfigPath, "isValid", false);
                  this._setFrontEndProperty(sConfigPath, "errors", oData.errors);
                  this._setFrontEndProperty(sConfigPath, "warnings", oData.warnings);
                  this.showValidationErrors(piConfig.config, sConfigPath);
                }
              } else {
                text = ConfigUtils.getText("HPH_PAT_CFG_INVALID_CONFIG");
                type = sap.ui.core.MessageType.Error;
                ConfigUtils.notifyUser(type, text, oData);
              }
              this._attachConfigModified();
            }.bind(this)
          );
        }
      });
    };

    /**
     * Handler for the press event on the Preview Config Button.
     * Opens a Dialog to show the configuration as JSON.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onPreviewConfigPressed = function (oEvent) {
      this.performAction(oEvent, function (configObj) {
        if (!this._oConfigPreviewDialog) {
          this._oConfigPreviewDialog = sap.ui.xmlfragment("hc.hph.patient.config.ui.views.PreviewConfig", this);
          this._oConfigPreviewDialog.addStyleClass(ConfigUtils.getContentDensityClass());
          this._oConfigPreviewDialog.setModel(new JSONModel(), "previewModel");
          this.getView().addDependent(this._oConfigPreviewDialog);
        }
        this._oConfigPreviewDialog.getModel("previewModel").setData({
          file: JSON.stringify(configObj.config, null, 4),
        });
        this._oConfigPreviewDialog.open();
      });
    };

    /**
     * Handler for the Close Button in the Preview Config Dialog.
     */
    ConfigListController.prototype.onConfigPreviewDialogClose = function () {
      this._oConfigPreviewDialog.close();
    };

    /**
     * Handler for the Copy Button in the Preview Config Dialog.
     */
    ConfigListController.prototype.onConfigPreviewDialogCopy = function () {
      var oTextArea = this._oConfigPreviewDialog.getContent()[0];

      var textElements = oTextArea.$().find("textarea, input");
      if (textElements.length > 0) {
        textElements[0].select();
        document.execCommand("copy");
      }
    };

    /**
     * Format and translate a language key.
     * @private
     * @param   {string} sLangKey Language identifier
     * @returns {string} Language name in the current user's language.
     */
    ConfigListController.prototype._langFormatter = function (sLangKey) {
      if (sLangKey) {
        var oLocaleData = new LocaleData(sap.ui.getCore().getConfiguration().getLocale());
        return oLocaleData.getLanguages()[sLangKey];
      }
      return ConfigUtils.getText("HPH_PAT_CFG_LANG_DEFAULT");
    };

    /**
     * Generates a human readable translated description of the error location
     * @param  {object} oConfig Patient Summary config
     * @param  {object} oError  Error description
     * @returns {string}         Human readable translated description of the error location
     */
    ConfigListController.prototype._getErrorLocationDescription = function (oConfig, oError) {
      var sErrorPath = oError.path;
      var aErrorPathParts = sErrorPath.split(".");
      var aLocationParts = [];
      if (aErrorPathParts[0] === "masterdata") {
        aLocationParts.push(ConfigUtils.getText("HPH_PAT_CFG_INSPECTOR_OPT_TITLE"));
        if (aErrorPathParts[1] === "title") {
          aLocationParts.push(ConfigUtils.getText("HPH_PAT_CFG_PAT_INSPECTOR_TITLE"));
        } else if (aErrorPathParts[1] === "details") {
          ConfigUtils.getText("HPH_PAT_CFG_PAT_INSPECTOR_DETAILS");
          if (aErrorPathParts.length >= 3) {
            var iSubheaderIndex = parseInt(aErrorPathParts[2], 10);
            var sSubheaderText = ConfigUtils.getText("HPH_PAT_CFG_PAT_ERROR_MSG_LOCATION_SUBHEADER_VIA_INDEX", [
              iSubheaderIndex + 1,
            ]);
            aLocationParts.push(sSubheaderText);
          }
        }
      } else if (aErrorPathParts[0] === "inspectorOptions") {
        aLocationParts.push(ConfigUtils.getText("HPH_PAT_CFG_PAT_INSPECTOR_TABS"));
        if (aErrorPathParts[1] === "overview") {
          aLocationParts.push(ConfigUtils.getText("HPH_PAT_CFG_OVERVIEW_TAB_ENABLED"));
        } else if (aErrorPathParts[1] === "tabExtensions") {
          aLocationParts.push(ConfigUtils.getText("HPH_PAT_CFG_EXTENSION_TABS"));
        } else if (aErrorPathParts[1] === "widgetExtensions") {
          aLocationParts.push(ConfigUtils.getText("HPH_PAT_CFG_EXTENSION_WIDGETS"));
        } else if (aErrorPathParts[1] === "timeline" && aErrorPathParts[2] === "zoom") {
          aLocationParts.push(ConfigUtils.getText("HPH_PAT_CFG_TL_ZOOM_OPTIONS"));
        }
      } else if (aErrorPathParts[0] === "lanes") {
        aLocationParts.push(ConfigUtils.getText("HPH_PAT_CFG_LANES_TAB_TITLE"));
        if (aErrorPathParts.length >= 2) {
          var iLaneIndex = parseInt(aErrorPathParts[1], 10);
          var sLanePath = "lanes." + iLaneIndex;
          var aLaneTitles = ConfigUtils.getPropertyByPath(oConfig, sLanePath + ".title");
          var sLaneText;
          if (aLaneTitles && aLaneTitles.length > 0 && aLaneTitles[0].value) {
            var sLaneName = aLaneTitles[0].value;
            sLaneText = ConfigUtils.getText("HPH_PAT_CFG_PAT_ERROR_MSG_LOCATION_LANE_VIA_NAME", [sLaneName]);
          } else {
            sLaneText = ConfigUtils.getText("HPH_PAT_CFG_PAT_ERROR_MSG_LOCATION_LANE_VIA_INDEX", [iLaneIndex + 1]);
          }
          aLocationParts.push(sLaneText);
          if (aErrorPathParts[2] === "title") {
            aLocationParts.push(ConfigUtils.getText("HPH_PAT_CFG_LANES_NAME_LOCALISATION"));
            if (aErrorPathParts.length >= 4) {
              var lang = aErrorPathParts[3].lang;
              aLocationParts.push(this._langFormatter(lang));
            }
          }
          if (aErrorPathParts[2] === "interactions") {
            if (aErrorPathParts.length >= 4) {
              var sInterPath = sLanePath + ".interactions." + aErrorPathParts[3];
              var sInterName = ConfigUtils.getPropertyByPath(oConfig, sInterPath + ".modelName");
              var sInterText;
              if (sInterName) {
                sInterText = ConfigUtils.getText("HPH_PAT_CFG_PAT_ERROR_MSG_LOCATION_INTER_VIA_NAME", [sInterName]);
              } else {
                var iInteractionIndex = parseInt(aErrorPathParts[3], 10);
                sInterText = ConfigUtils.getText("HPH_PAT_CFG_PAT_ERROR_MSG_LOCATION_INTER_VIA_INDEX", [
                  iInteractionIndex + 1,
                ]);
              }
              aLocationParts.push(sInterText);
              if (aErrorPathParts.length >= 5 && aErrorPathParts[4] === "attributes") {
                if (aErrorPathParts.length >= 6) {
                  var sAttributePath = sInterPath + ".attributes." + aErrorPathParts[5];
                  var sAttributeName = ConfigUtils.getPropertyByPath(oConfig, sAttributePath + ".modelName");
                  var sAttrText;
                  if (sAttributeName) {
                    sAttrText = ConfigUtils.getText("HPH_PAT_CFG_PAT_ERROR_MSG_LOCATION_ATTR_VIA_NAME", [
                      sAttributeName,
                    ]);
                  } else {
                    var iAttributeIndex = parseInt(aErrorPathParts[5], 10);
                    sAttrText = ConfigUtils.getText("HPH_PAT_CFG_PAT_ERROR_MSG_LOCATION_ATTR_VIA_INDEX", [
                      iAttributeIndex + 1,
                    ]);
                  }
                  aLocationParts.push(sAttrText);
                }
              }
            } else {
              aLocationParts.push(ConfigUtils.getText("HPH_PAT_CFG_INTERACTIONS_TITLE"));
            }
          }
        }
      }
      var sErrorLocation = "";
      if (aLocationParts.length > 0) {
        sErrorLocation += aLocationParts[0];
        for (var i = 1; i < aLocationParts.length; i++) {
          sErrorLocation = ConfigUtils.getText("HPH_PAT_CFG_PAT_ERROR_MSG_LOCATION_SEPARATOR", [
            sErrorLocation,
            aLocationParts[i],
          ]);
        }
      }
      sErrorLocation = ConfigUtils.getText("HPH_PAT_CFG_PAT_ERROR_MSG_LOCATION_FORMATTER", [sErrorLocation]);

      return sErrorLocation;
    };

    /**
     * Handler for adding an empty Patient Summary Configuration.
     * @param  {string} [sConfigVersion]  CDM Config Version, defaults to active or otherwise latest version.
     * @param  {Function} [fnCallback]    Callback
     */
    ConfigListController.prototype.onAddEmptyPSConfiguration = function (sConfigVersion, fnCallback) {
      var oBindingContext = this.getView().getBindingContext("analyticsModel");
      var oModel = this.getView().getModel("analyticsModel");
      var sPath = oBindingContext.getPath();
      var dmConfig = oModel.getProperty(sPath);

      if (!sConfigVersion) {
        sConfigVersion = ConfigUtils.getActiveOrLatestVersion(dmConfig.versions);
      }

      // find the active version
      this._getEmptyConfig(
        dmConfig.configId,
        sConfigVersion,
        function (oAddedPSConfig) {
          this.onAddNewPSConfiguration(oAddedPSConfig);
          if (fnCallback) {
            fnCallback();
          }
        }.bind(this)
      );
    };

    /**
     * Hanlder for adding a new Patient Summary configuration.
     * @param {object} oNewPsConfig Patient Summary configuration
     */
    ConfigListController.prototype.onAddNewPSConfiguration = function (oNewPsConfig) {
      var oBindingContext = this.getView().getBindingContext("analyticsModel");
      var oModel = this.getView().getModel("analyticsModel");
      var sPath = oBindingContext.getPath();

      // add a new item to the list
      var piConfigList = oModel.getProperty(sPath + "/configs");

      var iLength = piConfigList.length;
      oModel.setProperty(sPath + "/configs/" + iLength, oNewPsConfig);

      // select the newly created config
      this._setCurrentConfigPath(sPath + "/configs/" + (piConfigList.length - 1));
    };

    /**
     * Return an empty Patient Summary configuration.
     * @private
     * @param   {string} dmConfigId      Data model configuration id
     * @param   {string} dmConfigVersion Data model configuration version
     * @param   {function} callback      Callback with empty config as argument
     */
    ConfigListController.prototype._getEmptyConfig = function (dmConfigId, dmConfigVersion, callback) {
      var oAnalyticsModel = this.getView().getModel("analyticsModel");

      this.executeAsyncBusy(
        BackendLinker.getExtensions,
        BackendLinker,
        [oAnalyticsModel],
        function (status, mExtensions) {
          if (status !== "success") {
            ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "HPH_PAT_CFG_EXTENSION_SERVICE_FAILED");
            mExtensions = {
              tabs: [],
              widgets: [],
            };
          }
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
                configVersion: dmConfigVersion,
              },
            },
            frontEndProperties: this._getFrontEndPropertiesObject(false),
            config: {
              masterdata: {
                title: [
                  {
                    pattern: "",
                    values: [],
                  },
                ],
                details: [],
              },
              inspectorOptions: {
                overview: {
                  visible: true,
                },
                timeline: {
                  zoom: {
                    initialZoom: "rightZoom",
                    leftZoom: "1y",
                    middleZoom: "3y",
                    rightZoom: "lifespan",
                  },
                },
                tabExtensions: mExtensions.tabs,
                widgetExtensions: mExtensions.widgets,
              },
              configInformations: {
                note: "",
              },
              lanes: [],
            },
          };
          callback(config);
        }.bind(this)
      );
    };

    /**
     * Get the list of Patient Summary configurations.
     * @private
     * @returns {object[]} List of Patient Summary configurations.
     */
    ConfigListController.prototype._getPiConfigList = function () {
      var oBindingContext = this.getView().getBindingContext("analyticsModel");
      var path = oBindingContext.getPath();
      return this.getView()
        .getModel("analyticsModel")
        .getProperty(path + "/configs");
    };

    /**
     * Validate the Patient Summary configuration.
     * Make sure that the configuration exists, a data model configuration has been set, and a name has been set.
     * @private
     * @param   {object}  piConfig Patient Summary configuration
     * @returns {boolean} True, if it is valid.
     */
    ConfigListController.prototype._validatePiConfig = function (piConfig) {
      // TODO consider adding more validations
      if (!piConfig || !piConfig.meta) {
        ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "HPH_PAT_CFG_CONFIG_ERROR_INVALID_CONFIG");
        return false;
      }
      if (!piConfig.config) {
        ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "HPH_PAT_CFG_CONFIG_ERROR_INVALID_CONFIG_NO_VERSION");
        return false;
      }
      if (!piConfig.meta.configName) {
        ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "HPH_PAT_CFG_CONFIG_ERROR_INVALID_CONFIG_NO_NAME");
        return false;
      }
      return true;
    };

    /**
     * Sort lane definitions within given config by their order
     * @param  {object} oConfig Patient Summary Configuration
     */
    ConfigListController.prototype._orderLanes = function (oConfig) {
      if (Array.isArray(oConfig.config.lanes)) {
        oConfig.config.lanes.sort(function (oLaneA, oLaneB) {
          return oLaneA.order - oLaneB.order;
        });
      }
    };

    /**
     * Update a Patient Summary configuration in the Model based on the given path.
     * @private
     * @param {string} sConfigPath    Path to the configuration in the Model
     * @param {object} piConfig Patient Summary configuration object
     */
    ConfigListController.prototype._updateModelForOnePiConfig = function (sConfigPath, piConfig) {
      var oModel = this.getView().getModel("analyticsModel");
      if (piConfig.meta) {
        oModel.setProperty(sConfigPath + "/meta", piConfig.meta);
      }
      if (piConfig.config) {
        oModel.setProperty(sConfigPath + "/config", piConfig.config);
      }
      sap.ui.getCore().getEventBus().publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_UPDATE_FINISHED);
    };

    /**
     * Remove one Patient Summary configuration from the list.
     * @private
     * @param {number} iIndexInList Index of the configuration
     */
    ConfigListController.prototype._removeConfigFromList = function (iIndexInList) {
      if (iIndexInList < 0) {
        return;
      }

      var aConfigs = this._getPiConfigList();
      aConfigs.splice(iIndexInList, 1);

      var sPath = this.getView().getBindingContext("analyticsModel").getPath();
      this.getView()
        .getModel("analyticsModel")
        .setProperty(sPath + "/configs", aConfigs);

      if (aConfigs.length > 0) {
        // set the first config from the list to be selected
        var sFirstConfigPath = sPath + "/configs/0";
        this._loadPSConfig(sFirstConfigPath);
      } else {
        this._setCurrentConfigPath("");
      }
    };

    /**
     * Handler for the press event on the import Config button.
     * Creates and opens the Popover at the event source.
     * @param {sap.ui.base.Event} oEvent SAPUI5 Press Event
     */
    ConfigListController.prototype.onImportConfigurationPressed = function (oEvent) {
      this.performAction(oEvent, function () {
        var path = oEvent.getSource().getBindingContext("analyticsModel").getPath();
        this.onImportConfiguration(path);
      });
    };

    /**
     * import a new configuration to the targetConfigPath
     * @param {string} targetConfigPath if not provided add a new configuration
     */
    ConfigListController.prototype.onImportConfiguration = function (targetConfigPath) {
      if (!this._oImportDialog) {
        this._oImportDialog = sap.ui.xmlfragment("hc.hph.patient.config.ui.views.ImportConfig", this);
        this._oImportDialog.addStyleClass(ConfigUtils.getContentDensityClass());
        this.getView().addDependent(this._oImportDialog);
        var oModel = new JSONModel();
        oModel.setSizeLimit(Infinity);
        this._oImportDialog.setModel(oModel, "importModel");
      }
      var oVersions = this.getView().getBindingContext("analyticsModel").getProperty("versions");
      var aSortedVersions = Object.keys(oVersions)
        .map(function (key) {
          return oVersions[key];
        })
        .sort(function (a, b) {
          return parseInt(b.version, 10) - parseInt(a.version, 10);
        });
      var activeVersion = ConfigUtils.getActiveOrLatestVersion(oVersions);
      this._oImportDialog.getModel("importModel").setData({
        selectedVersion: activeVersion,
        versions: aSortedVersions,
        file: "",
        targetConfig: targetConfigPath,
      });
      this._oImportDialog.open();
    };

    /**
     * Handler for the press event on the export Config button.
     * @param {sap.ui.base.Event} oEvent SAPUI5 Press Event
     */
    ConfigListController.prototype.onExportConfigurationPressed = function (oEvent) {
      this.performAction(oEvent, function (piConfig, sConfigPath) {
        var bModified = this._getFrontEndProperty(sConfigPath, "isModified");
        var bSaved = this._getFrontEndProperty(sConfigPath, "isSaved");

        if (bSaved && !bModified) {
          this.exportConfiguration(sConfigPath);
        } else {
          if (!this._oExportDialog) {
            this._oExportDialog = sap.ui.xmlfragment("hc.hph.patient.config.ui.views.ExportConfig", this);
            this._oExportDialog.addStyleClass(ConfigUtils.getContentDensityClass());
            this.getView().addDependent(this._oExportDialog);
            this._oExportDialog.setModel(new JSONModel(), "exportModel");
          }

          this._oExportDialog.getModel("exportModel").setData({
            config: piConfig,
            configPath: sConfigPath,
          });
          this._oExportDialog.open();
        }
      });
    };

    ConfigListController.prototype.onExportConfigurationWithSave = function (oEvent) {
      this._oExportDialog.close();
      var oSource = oEvent.getSource();
      var oModel = oSource.getModel("exportModel");

      var oConfig = oModel.getProperty("/config");
      var sConfigPath = oModel.getProperty("/configPath");
      this.activateConfig(
        oConfig,
        sConfigPath,
        function (status) {
          if (status === "success") {
            this.exportConfiguration(sConfigPath);
          }
        }.bind(this)
      );
    };
    ConfigListController.prototype.onExportConfigurationCanceled = function () {
      this._oExportDialog.close();
    };

    /**
     * Export a stored configuration.
     * @param {string} sConfigPath Path to the config in the model
     */
    ConfigListController.prototype.exportConfiguration = function (sConfigPath) {
      if (!sConfigPath) {
        sConfigPath = this._getCurrentConfigPath();
      }
      var oModel = this.getView().getModel("analyticsModel");
      var oContext = oModel.getContext(sConfigPath);
      var meta = {
        configId: oContext.getProperty("meta/configId"),
        configVersion: oContext.getProperty("meta/configVersion"),
      };

      var xDocument = this.getView().getDomRef().ownerDocument;
      var xDownloadLink = xDocument.createElement("a");
      xDownloadLink.href = BackendLinker.getConfigDownloadLink(meta);
      xDocument.body.appendChild(xDownloadLink);
      xDownloadLink.click();
      xDocument.body.removeChild(xDownloadLink);
    };

    /**
     * On import canceled handler for the Import Dialog.
     * Closes the Dialog without any action.
     */
    ConfigListController.prototype.onImportConfigurationCanceled = function () {
      this._oImportDialog.close();
    };

    /**
     * Handler for the import Button in the Import Config Dialog.
     * Creates a new config with the imported data.
     * @param {sap.ui.base.Event} oEvent Button press event
     */
    ConfigListController.prototype.onImportConfigVersion = function (oEvent) {
      var that = this;
      var oModel = oEvent.getSource().getModel("importModel");
      var targetConfigPath = oModel.getProperty("/targetConfig");
      var mDependentConfig = {
        configId: that.getView().getBindingContext("analyticsModel").getProperty("configId"),
        configVersion: oModel.getProperty("/selectedVersion"),
      };
      var mConfig;
      try {
        mConfig = JSON.parse(oModel.getProperty("/file"));
        if (!ConfigUtils.isValidConfig(mConfig)) {
          throw new Error("Invalid Config");
        }
      } catch (oError) {
        ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "HPH_PAT_CFG_CONFIG_WRONG_IMPORT_FORMAT");
        return;
      }
      if (targetConfigPath === null || typeof targetConfigPath === "undefined") {
        this.onAddEmptyPSConfiguration(mDependentConfig.configVersion);
      }
      sap.ui.getCore().getEventBus().publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_WAS_IMPORTED, {
        importedConfig: mConfig,
        dependentConfig: mDependentConfig,
      });
      this._oImportDialog.close();
    };

    /**
     * Handler for the selection of a Patient Summary configuration.
     * Synchronizes the selection between the used Models.
     */
    ConfigListController.prototype.onListUpdateFinished = function () {
      var sSelectedPatientConfigId = this._getCurrentConfigPath();
      if (sSelectedPatientConfigId) {
        this._setFrontEndProperty(sSelectedPatientConfigId, "isSelected", true);
      }
    };

    return ConfigListController;
  }
);
