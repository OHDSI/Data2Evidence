sap.ui.define(
  [
    "jquery.sap.global",
    "hc/hph/patient/config/ui/lib/BackendLinker",
    "hc/hph/patient/config/ui/lib/ConfigUpgrade",
    "hc/hph/patient/config/ui/lib/ConfigUtils",
    "hc/hph/patient/config/ui/lib/Formatter",
    "sap/m/MessageBox",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
  ],
  function (jQuery, BackendLinker, ConfigUpgrade, ConfigUtils, Formatter, MessageBox, Controller, JSONModel) {
    "use strict";

    /**
     * Constructor for the DetailsTab Controller.
     * @constructor
     *
     * @classdesc
     * Controller for the details tab.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.hph.patient.config.ui.views.DetailsTab
     */
    var DetailsTabController = Controller.extend("hc.hph.patient.config.ui.views.DetailsTab");

    DetailsTabController.prototype.formatter = Formatter;

    /**
     * Initialize the Controller.
     * @protected
     * @override
     */
    DetailsTabController.prototype.onInit = function () {
      sap.ui
        .getCore()
        .getEventBus()
        .subscribe(ConfigUtils.configEvents.CONFIG_ANALYTICS_WAS_IMPORTED, this.onConfigWasImported, this);

      sap.ui
        .getCore()
        .getEventBus()
        .subscribe(ConfigUtils.configEvents.CONFIG_ANALYTICS_VERSION_LIST_UPDATED, this.OnVersionListUpdated, this);

      var versionSelectionModel = new JSONModel({
        hideInactive: false,
      });
      this.getView().setModel(versionSelectionModel);
    };

    /**
     * Destroy the Controller.
     * @protected
     * @override
     */
    DetailsTabController.prototype.onExit = function () {
      sap.ui
        .getCore()
        .getEventBus()
        .unsubscribe(ConfigUtils.configEvents.CONFIG_ANALYTICS_WAS_IMPORTED, this.onConfigWasImported, this);

      sap.ui
        .getCore()
        .getEventBus()
        .unsubscribe(ConfigUtils.configEvents.CONFIG_ANALYTICS_VERSION_LIST_UPDATED, this.OnVersionListUpdated, this);
    };

    /**
     * Handler for the change of the selection event on the data model version combo.
     * validation...
     * @param {sap.ui.base.Event} oEvent ComboBox selectionChange event
     */
    DetailsTabController.prototype.onDataModelVersionChanged = function (oEvent) {
      var that = this;
      var comboContol = oEvent.getSource();
      var selectedKey = comboContol.getSelectedKey();
      var lastValue = comboContol._lastValue;
      var separator = " - ";
      var idxActive = lastValue.search(separator.concat(ConfigUtils.getText("HPH_PAT_CFG_TITLE_ACTIVE_VERSION")));

      if (idxActive !== -1) {
        lastValue = lastValue.substring(0, idxActive);
      }

      if (typeof lastValue !== "undefined" && lastValue !== "") {
        var sMessage = ConfigUtils.getText("HPH_PAT_CFG_CHANGE_DM_VERSION");
        var keepText = ConfigUtils.getText("HPH_PAT_CFG_CHANGE_DM_VERSION_KEEP");
        var cleanText = ConfigUtils.getText("HPH_PAT_CFG_CHANGE_DM_VERSION_CLEAN");

        MessageBox.show(sMessage, {
          icon: MessageBox.Icon.QUESTION,
          title: ConfigUtils.getText("HPH_PAT_CFG_CHANGE_DM_VERSION_TITLE"),
          actions: [keepText, cleanText, MessageBox.Action.CANCEL],
          onClose: function (oAction) {
            if (oAction === cleanText) {
              that._versionWasChanged(selectedKey, false);
            } else if (oAction === keepText) {
              that._versionWasChanged(selectedKey, true);
            } else {
              // restore to previous value
              comboContol.setSelectedKey(lastValue);
            }
          },
        });
      } else {
        that._versionWasChanged(selectedKey, false);
      }
    };

    /**
     * Apply the settings in the imported config to the current one when possible (i.e. attribute/interaction exists).
     * @param {string} sChannelId Channel Id, the default channel
     * @param {string} sEventId   Event Id
     * @param {object} mEventData Event data object, includes dependentConfig and importedConfig
     */
    DetailsTabController.prototype.onConfigWasImported = function (sChannelId, sEventId, mEventData) {
      var mImportedConfig = mEventData.importedConfig;
      var mDependentConfig = mEventData.dependentConfig;

      this._upgradeVersion(mDependentConfig, mImportedConfig, function () {
        ConfigUtils.notifyUser(sap.ui.core.MessageType.Success, "HPH_PAT_CFG_IMPORT_CONFIG_SUCCESS");
      });
    };

    DetailsTabController.prototype._updateTabExtensions = function (oConfig, fCallback) {
      var oAnalyticsModel = this.getView().getModel("analyticsModel");
      BackendLinker.getExtensions(oAnalyticsModel, function (sStatus, mExtensions) {
        if (sStatus !== "success") {
          ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "HPH_PAT_CFG_EXTENSION_SERVICE_FAILED");
          mExtensions = {
            tabs: [],
            widgets: [],
          };
        }
        // Extend tab entries
        var aPrevTabExt = oConfig.inspectorOptions.tabExtensions;
        oConfig.inspectorOptions.tabExtensions = JSON.parse(JSON.stringify(mExtensions.tabs));
        if (Array.isArray(aPrevTabExt) && aPrevTabExt.length > 0) {
          aPrevTabExt.forEach(function (oPrevTabExt) {
            var aMatches = oConfig.inspectorOptions.tabExtensions.filter(function (oNewTabExt) {
              return oPrevTabExt.extensionId === oNewTabExt.extensionId;
            });
            if (aMatches.length >= 1) {
              // There can only be one or no match per extension id
              aMatches[0].visible = Boolean(oPrevTabExt.visible);
            }
          });
        }
        // Extend widget entries
        var aPrevWidgetExt = oConfig.inspectorOptions.widgetExtensions;
        oConfig.inspectorOptions.widgetExtensions = JSON.parse(JSON.stringify(mExtensions.widgets));
        if (Array.isArray(aPrevWidgetExt) && aPrevWidgetExt.length > 0) {
          aPrevWidgetExt.forEach(function (oPrevWidgetExt) {
            var aMatches = oConfig.inspectorOptions.widgetExtensions.filter(function (oNewWidgetExt) {
              return oPrevWidgetExt.extensionId === oNewWidgetExt.extensionId;
            });
            if (aMatches.length >= 1) {
              // There can only be one or no match per extension id
              aMatches[0].visible = Boolean(oPrevWidgetExt.visible);
            }
          });
        }
        fCallback(sStatus, oConfig);
      });
    };

    /**
     * Upgrade the config version.
     * @private
     * @param {object} mDependentConfig         Dependent config information, id and version
     * @param {object} mCurrentConfig           Current configuration object
     * @param {function} [fOnSuccessCallback]   Optional callback that is executed if the upgrade succeeds
     */
    DetailsTabController.prototype._upgradeVersion = function (mDependentConfig, mCurrentConfig, fOnSuccessCallback) {
      this._setTabsBusy(true);

      var oAnalyticsModel = this.getView().getBindingContext("analyticsModel").getModel();
      var oVersionsModel = this.getView().getModel("versionsModel");
      var sConfigPath = this.getView().getBindingContext("analyticsModel").getPath() + "/config";
      var sMetaPath =
        this.getView().getBindingContext("analyticsModel").getPath() + "/meta/dependentConfig/configVersion";
      var that = this;

      if (typeof mCurrentConfig === "undefined") {
        var mNewConfig = BackendLinker.getEmptyConfig(mDependentConfig.configId, mDependentConfig.configVersion);
        oAnalyticsModel.setProperty(sConfigPath, mNewConfig);
      }

      BackendLinker.getTemplate(
        oAnalyticsModel,
        mDependentConfig.configId,
        mDependentConfig.configVersion,
        function (status, mData) {
          if (status === "success") {
            oVersionsModel.setProperty("/currentMasterdataAttributes", mData.masterdataAttributes);

            if (typeof mCurrentConfig !== "undefined") {
              var upgradedConfig = ConfigUpgrade.upgradeConfig(mCurrentConfig, mData);
              that._updateTabExtensions(upgradedConfig, function (tabExtStatus, newConfig) {
                // replace all existing CDW-related elements
                oAnalyticsModel.setProperty(sConfigPath, newConfig);
                oAnalyticsModel.setProperty(sMetaPath, mDependentConfig.configVersion);
                if (tabExtStatus === "success" && fOnSuccessCallback) {
                  fOnSuccessCallback();
                }
                that._setTabsBusy(false);
              });
            }
          } else {
            ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "HPH_PAT_CFG_CONFIG_ERROR_IN_LOADING");
            that._setTabsBusy(false);
          }
        }
      );
    };

    /**
     * Update the version if it was changed.
     * @private
     * @param {string}  selectedKey Selected Key, unused
     * @param {boolean} bKeepCurrent Whether to keep the current config
     */
    DetailsTabController.prototype._versionWasChanged = function (selectedKey, bKeepCurrent) {
      var mDependentConfig = this._getDependentConfigObject();
      var mCurrentConfig;
      if (bKeepCurrent) {
        var sConfigPath = this.getView().getBindingContext("analyticsModel").getPath() + "/config";
        mCurrentConfig = this.getView().getBindingContext("analyticsModel").getModel().getProperty(sConfigPath);
      }
      this._upgradeVersion(mDependentConfig, mCurrentConfig);
    };

    /**
     * Set the busy state of the Tab.
     * @private
     * @param {boolean} bBusy New busy state
     */
    DetailsTabController.prototype._setTabsBusy = function (bBusy) {
      this.getView().getModel("uiModel").setProperty("/tabsBusy", bBusy);
    };

    /**
     * Get the data model configuration metadata on which this configuration depends.
     * @private
     * @returns {object} Data model configuration metadata
     */
    DetailsTabController.prototype._getDependentConfigObject = function () {
      var oBindingContext = this.getView().getBindingContext("analyticsModel");
      return oBindingContext.getModel().getProperty(oBindingContext.getPath() + "/meta/dependentConfig");
    };

    /**
     * Check whether the patient config string is filled.
     * @param   {string}  sPatientConfig Patient Config string
     * @returns {boolean} False, if empty
     */
    DetailsTabController.prototype.checkPatientConfig = function (sPatientConfig) {
      return Boolean(sPatientConfig);
    };

    DetailsTabController.prototype.OnVersionListUpdated = function () {
      var inactiveControl = this.byId("disableInactiveCheckBox");
      inactiveControl.setSelected(false);

      var comboControl = this.byId("dataModelVersionCombo");
      comboControl.getBinding("items").filter([]);
      comboControl.bindProperty("selectedKey", "analyticsModel>meta/dependentConfig/configVersion");
    };

    DetailsTabController.prototype.onFilterInactive = function (oEvent) {
      var filterInactive = oEvent.getParameter("selected");
      var inactiveFilter = [];
      if (filterInactive) {
        var oFilter1 = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "A");
        inactiveFilter.push(oFilter1);
      }
      var comboControl = this.byId("dataModelVersionCombo");
      comboControl.getBinding("items").filter(inactiveFilter);
    };

    return DetailsTabController;
  }
);
