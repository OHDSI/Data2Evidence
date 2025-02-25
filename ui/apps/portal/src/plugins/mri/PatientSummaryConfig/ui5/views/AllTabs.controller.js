sap.ui.define(
  [
    "jquery.sap.global",
    "hc/hph/patient/config/ui/lib/ConfigUtils",
    "sap/ui/core/mvc/Controller",
    "hc/hph/patient/config/ui/lib/BackendLinker",
    "sap/ui/model/json/JSONModel",
  ],
  function (jQuery, ConfigUtils, Controller, BackendLinker, JSONModel) {
    "use strict";

    /**
     * Constructor for the AllTabs Controller.
     * @constructor
     *
     * @classdesc
     * Controller for the details page of the Split layout. Contains the IconTabBar.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.hph.patient.config.ui.views.AllTabs
     */
    var AllTabsController = Controller.extend("hc.hph.patient.config.ui.views.AllTabs");

    AllTabsController.prototype.onInit = function () {
      var data = {
        versions: [],
      };
      var oModel = new JSONModel(data);
      oModel.setSizeLimit(Infinity);
      this.getView().setModel(oModel, "versionsModel");

      this.getView().setModel(
        new JSONModel({
          tabsBusy: false,
        }),
        "uiModel"
      );

      this._tabBar = this.byId("tabBar");

      this._lanesTab = this.byId("lanesTab");
      this._detailsTab = this.byId("detailsTab");

      this._currentTabKey = "detailsTab";
    };

    /**
     * Handler for the IconTabBar tabselect.
     * When go out of the lanes tab, reset the lanes tab to the overview.
     * @param {sap.ui.base.Event} oEvent IconTabBar select event
     */
    AllTabsController.prototype.onTabSelect = function (oEvent) {
      if (this._currentTabKey === "lanesTab" && oEvent.getParameters().key !== "lanesTab") {
        this.byId("lanesTabView").getController().goToPage("lanesTabPage1");
      }

      this._currentTabKey = oEvent.getParameters().key;
    };

    /**
     * Get the active version if there is any. Otherwise, get the latest.
     * @private
     * @param   {object} mVersions Object of config versions
     * @returns {string} Config version.
     */
    AllTabsController.prototype._getActiveOrLatestVersion = function (mVersions) {
      var versionNumbers = Object.keys(mVersions);
      var sVersion;
      for (var i = 0; i < versionNumbers.length; i++) {
        if (mVersions[versionNumbers[i]].status === "A") {
          return mVersions[versionNumbers[i]].version;
        } else if (!sVersion || parseInt(mVersions[versionNumbers[i]].version, 10) > parseInt(sVersion, 10)) {
          sVersion = mVersions[versionNumbers[i]].version;
        }
      }
      return sVersion;
    };

    /**
     * Bind data to the "dynamicBindingsModel".
     * @private
     * @param {sap.ui.model.json.JSONModel} oBindingModel "dynamicBindingsModel" Model
     */
    AllTabsController.prototype._bindToDynamicModel = function (oBindingModel) {
      var oRootContext = oBindingModel.getContext("/");

      oBindingModel.bindProperty("selectedPatientConfig", oRootContext).attachChange(
        function (evt) {
          var sPath = evt.getSource().getValue();
          if (sPath) {
            this._setTabsBusy(true);
            // switch lanes tab back to lanes overview
            this.byId("lanesTabView").getController().goToPage("lanesTabPage1");
            this.getView().bindElement("analyticsModel>" + sPath);
            var oBindingContext = this.getView().getBindingContext("analyticsModel");
            var oAnalyticsModel = this.getView().getModel("analyticsModel");
            var oVersionsModel = this.getView().getModel("versionsModel");

            var oDependentConfig = oBindingContext.getProperty("meta/dependentConfig");
            if (!oDependentConfig.configVersion) {
              var versions = oAnalyticsModel.getProperty("/dmConfigList/" + oDependentConfig.configId + "/versions");
              oDependentConfig.configVersion = this._getActiveOrLatestVersion(versions);
            }
            BackendLinker.getTemplate(
              oAnalyticsModel,
              oDependentConfig.configId,
              oDependentConfig.configVersion,
              function (status, oData) {
                if (status === "success") {
                  oVersionsModel.setProperty("/currentMasterdataAttributes", oData.masterdataAttributes);
                } else {
                  ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "HPH_PAT_CFG_CONFIG_ERROR_IN_LOADING");
                }
                this._setTabsBusy(false);
              }.bind(this)
            );
          }
        }.bind(this)
      );

      // actions when the DM config changes
      oBindingModel.bindProperty("selectedDmConfig", oRootContext).attachChange(
        function (evt) {
          var sPath = evt.getSource().getValue();
          var oAnalyticsModel = this.getView().getModel("analyticsModel");
          var oVersions = oAnalyticsModel.getProperty("/dmConfigList/" + sPath + "/versions");
          var aSortedVersions = Object.keys(oVersions)
            .map(function (key) {
              return oVersions[key];
            })
            .sort(function (a, b) {
              return parseInt(b.version, 10) - parseInt(a.version, 10);
            });
          this.getView().getModel("versionsModel").setProperty("/versions", aSortedVersions);
          sap.ui.getCore().getEventBus().publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_VERSION_LIST_UPDATED);
        }.bind(this)
      );
    };

    /**
     * Set the busy state of the Tab.
     * @private
     * @param {boolean} bBusy New busy state
     */
    AllTabsController.prototype._setTabsBusy = function (bBusy) {
      this.getView().getModel("uiModel").setProperty("/tabsBusy", bBusy);
    };

    /**
     * Check whether the patient config string is filled.
     * @param   {string}  sPatientConfig Patient Config string
     * @returns {boolean} False, if empty
     */
    AllTabsController.prototype.checkPatientConfig = function (sPatientConfig) {
      return Boolean(sPatientConfig);
    };

    return AllTabsController;
  }
);
