sap.ui.define(
  [
    "jquery.sap.global",
    "hc/hph/patient/config/ui/lib/BackendLinker",
    "hc/hph/patient/config/ui/lib/ConfigUtils",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
  ],
  function (jQuery, BackendLinker, ConfigUtils, Controller, JSONModel) {
    "use strict";

    /**
     * Constructor for the MainEditor Controller.
     * @constructor
     *
     * @classdesc
     * Controller for the app.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.hph.patient.config.ui.views.MainEditor
     */
    var MainEditorController = Controller.extend("hc.hph.patient.config.ui.views.MainEditor");

    /**
     * Initiates the data model and attaches to relevant events.
     */
    MainEditorController.prototype.onInit = function () {
      this.dataModelCombo = this.byId("dataModelConfigurationsCombo");
      this.configListView = this.byId("anConfigList");

      this.configListView.getController().attachEvent("busyStateChangeRequested", this._setBusy, this);

      this._setInitDataModel();
    };
    /**
     * Handles the busy state change request event
     * - updates the busy state of the configuration app.
     * @param {sap.ui.base.Event} oEvent Event with parameter "state"
     */
    MainEditorController.prototype._setBusy = function (oEvent) {
      var bState = oEvent.getParameter("state");
      this.byId("sapPatientInspectorConfigApp").setBusy(bState);
    };

    /**
     * Loads the list of available configurations and initializes the controls based on the results.
     */
    MainEditorController.prototype._setInitDataModel = function () {
      var that = this;
      var oModel = new JSONModel();
      oModel.setSizeLimit(Infinity);
      this.getView().setModel(oModel, "analyticsModel");

      var oBindingsModel = new JSONModel();
      this.getView().setModel(oBindingsModel, "dynamicBindingsModel");

      // bind the patient config to the DM config such that the first patient config is automatically selected
      // when DM selection changes
      oBindingsModel.bindProperty("selectedDmConfig", oBindingsModel.getContext("/")).attachChange(function (oEvent) {
        var sDmConfigPath = oEvent.getSource().getValue();
        var oDmConfig = that
          .getView()
          .getModel("analyticsModel")
          .getProperty("/dmConfigList/" + sDmConfigPath);
        if (oDmConfig && oDmConfig.configs.length > 0) {
          // set the first config from the list to be selected
          oBindingsModel.setProperty("/selectedPatientConfig", "/dmConfigList/" + sDmConfigPath + "/configs/0");
        } else {
          oBindingsModel.setProperty("/selectedPatientConfig", "");
        }
      });

      var oAllTabsController = this.byId("allTabs").getController();
      oAllTabsController._bindToDynamicModel.call(this.byId("allTabs").getController(), oBindingsModel);
      var oAnConfigListCont = this.byId("anConfigList").getController();
      oAnConfigListCont._bindToDynamicModel.call(this.byId("anConfigList").getController(), oBindingsModel);

      BackendLinker.getAllConfigs(function (result, aData) {
        if (result === "success") {
          var mDmConfigs = {};
          var sFirstDmKey;
          aData.forEach(function (mDmConfig, index) {
            if (index === 0) {
              sFirstDmKey = mDmConfig.configId;
            }
            mDmConfigs[mDmConfig.configId] = mDmConfig;
          });
          oModel.setProperty("/dmConfigList", mDmConfigs);

          // select the first config from the list
          that.getView().getModel("dynamicBindingsModel").setProperty("/selectedDmConfig", sFirstDmKey);
        } else {
          ConfigUtils.notifyUser(
            sap.ui.core.MessageType.Error,
            "HPH_PAT_CFG_CONFIG_ERROR_IN_LOADING",
            aData ? aData : ""
          );
        }
      });
    };

    /**
     * Get the configuration metadata of the currently selected datamodel configuration.
     * @private
     * @returns {object} Datamodel configuration metadata with configId and configName
     */
    MainEditorController.prototype._getCurrentDataModelDetails = function () {
      var configDetails = {
        configId: null,
        configName: null,
      };
      var selectedKey = this.dataModelCombo.getSelectedKey();
      if (selectedKey && selectedKey !== "") {
        configDetails.configId = selectedKey;
        configDetails.configName = this.dataModelCombo.getSelectedItem().getText();
      }
      return configDetails;
    };

    /**
     * Get the index of the datamodel configuration identified by id.
     * @private
     * @param   {string} dataModelConfigKey ConfigId
     * @returns {number} Index of the configuration or -1.
     */
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
     * Creates a new empty configuration and opens it.
     */
    MainEditorController.prototype.onAddConfiguration = function () {
      this.configListView.getController().onAddEmptyPSConfiguration();
    };

    /**
     * Handler for the press event on the import Config button.
     * Opens the Import Dialog.
     */
    MainEditorController.prototype.onImportConfiguration = function () {
      if (!this._oImportDialog) {
        this._oImportDialog = sap.ui.xmlfragment("hc.hph.patient.config.ui.views.ImportConfig", this);
        this._oImportDialog.addStyleClass(ConfigUtils.getContentDensityClass());
        this.getView().addDependent(this._oImportDialog);
        var oModel = new JSONModel();
        oModel.setSizeLimit(Infinity);
        this._oImportDialog.setModel(oModel, "importModel");
      }
      var oVersions = this.configListView.getBindingContext("analyticsModel").getProperty("versions");
      var aSortedVersions = Object.keys(oVersions)
        .map(function (key) {
          return oVersions[key];
        })
        .sort(function (a, b) {
          return parseInt(b.version, 10) - parseInt(a.version, 10);
        });
      var selectedVersion = ConfigUtils.getActiveOrLatestVersion(oVersions);

      this._oImportDialog.getModel("importModel").setProperty("/", {
        selectedVersion: selectedVersion,
        versions: aSortedVersions,
        file: "",
      });
      this._oImportDialog.open();
    };

    /**
     * On import canceled handler for the Import Dialog.
     * Closes the Dialog without any action.
     */
    MainEditorController.prototype.onImportConfigurationCanceled = function () {
      this._oImportDialog.close();
    };

    /**
     * Handler for the import Button in the Import Config Dialog.
     * Creates a new config with the imported data.
     * @param {sap.ui.base.Event} oEvent Button press event
     */
    MainEditorController.prototype.onImportConfigVersion = function (oEvent) {
      var oModel = oEvent.getSource().getModel("importModel");
      var mDependentConfig = {
        configId: this.configListView.getBindingContext("analyticsModel").getProperty("configId"),
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
      this.configListView.getController().onAddEmptyPSConfiguration(mDependentConfig.configVersion, function () {
        sap.ui.getCore().getEventBus().publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_WAS_IMPORTED, {
          importedConfig: mConfig,
          dependentConfig: mDependentConfig,
        });
      });
      this._oImportDialog.close();
    };

    /**
     * Handler for the change of the selection event on the data model combo.
     * refreshes the application config list
     * @param {sap.ui.base.Event} oEvent Select change event
     */
    MainEditorController.prototype.onDataModelSelectionChange = function (oEvent) {
      var sDmConfigId = oEvent.getParameter("selectedItem").getKey();
      var sDmPath = "/dmConfigList/" + sDmConfigId;
      this.byId("anConfigList").bindContext("analyticsModel>" + sDmPath);
      this.getView().getModel("dynamicBindingsModel").setProperty("/selectedDmConfig", sDmConfigId);
    };

    /**
     * Get a map of all datamodel configurations with the id as key.
     * @private
     * @returns {object} Map of datamodel configurations
     */
    MainEditorController.prototype._getDmConfigList = function () {
      return this.getView().getModel("analyticsModel").getData().dmConfigList;
    };

    /**
     * Handle Nav Back Button.
     * Navigate back to the previous app.
     */
    MainEditorController.prototype.handleNavButtonPress = function () {
      sap.ushell.Container.getService("CrossApplicationNavigation").backToPreviousApp();
    };

    return MainEditorController;
  }
);
