sap.ui.define(
  [
    "jquery.sap.global",
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "hc/hph/config/global/ui/lib/BackendLinker",
    "sap/ui/model/json/JSONModel",
    "hc/hph/cdw/cockpit/ui/utils/Utils",
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
  ],
  function (
    jQuery,
    Controller,
    MessageBox,
    BackendLinker,
    JSONModel,
    Utils,
    ConfigUtils
  ) {
    "use strict";

    var pholderKeys = [
      "@INTERACTION",
      "@OBS",
      "@CODE",
      "@MEASURE",
      "@REF",
      "@PATIENT",
      "@TEXT",
    ];

    var SettingsController = Controller.extend(
      "hc.hph.config.global.ui.views.GlobalSettings"
    );
    SettingsController.developerMode = false;

    SettingsController.prototype.onInit = function () {
      var that = this;
      var sValue = jQuery.sap.getUriParameters().get("devMode");
      if (!(sValue === null) && sValue === "1") {
        SettingsController.developerMode = true;
      }

      if (!SettingsController.developerMode) {
        this.getView()
          .byId("globalSettingDetailPage")
          .removeAggregation(
            "content",
            this.getView().byId("developerSetting")
          );
        this.getView()
          .byId("masterTabList")
          .removeAggregation("items", this.getView().byId("developerTab"));
      }

      var languageList = this.getView().byId("languageList");

      languageList.bindAggregation(
        "items",
        "globalSettingsModel>/language",
        function (index, oItem) {
          var listItem = new sap.m.CustomListItem();
          listItem.setBindingContext("globalSettingsModel", oItem.getPath());
          var oPath = "globalSettingsModel>" + oItem.getPath();

          var oInput = new sap.m.Input({ width: "70%" });
          oInput.bindValue(oPath);
          listItem.addContent(oInput);

          listItem.addContent(
            new sap.m.Button({
              icon: "sap-icon://delete",
              tooltip: "{i18n>HPH_CFG_GLOBAL_BUTTON_DELETE_LANGUAGE_TOOLTIP}",
              type: "Transparent",
              press: function (oEvent) {
                that.deleteLanguage(oEvent);
              },
            })
          );
          listItem.addStyleClass("sapGlobalSettingLanguageForm");
          return listItem;
        }
      );

      BackendLinker.loadSettings(function (result, oData) {
        if (result === "error") {
          that._createAlertDialog(
            "HPH_CFG_GLOBAL_CONNECT_FAILED_TITLE",
            "HPH_CFG_GLOBAL_CONNECT_FAILED_MESSAGE",
            oData ? ": " + oData : ""
          );
        } else {
          if (oData && !(oData.configId === "")) {
            that.globalSettingsModel = new sap.ui.model.json.JSONModel({
              tableMapping: oData.tableMapping,
              guardedTableMapping: oData.guardedTableMapping,
              language: oData.language,
              others: oData.others,
              settings: oData.settings,
              shared: oData.shared,
              configId: oData.configId,
            });
            that
              .getView()
              .setModel(that.globalSettingsModel, "globalSettingsModel");
            that.getAllColumns(oData.tableMapping);
          } else {
            that.setDefault();
          }
        }
        //call the metadata config load function
        that.CDWMetadataConfigLoad(oData);
      });

      var displayModel = new JSONModel({ selectedView: "" });
      this.getView().setModel(displayModel, "displayModel");

      this.errorList = [];
    };

    SettingsController.prototype.CDWMetadataConfigLoad = function (oData) {
      var action = "loadDefaultSetting";
      if (oData && !(oData.configId === "")) {
        action = "loadGlobalSetting";
      } else {
        action = "loadDefaultSetting";
      }
      var that = this;

      ConfigUtils.ajax(
        jQuery.extend(
          {
            type: "POST",
            url: "/hc/hph/config/services/cdwMetadataConfig.xsjs",
          },
          {
            data: JSON.stringify({
              action: action,
            }),
          }
        )
      )
        .done(function (oData) {
          that.getView().byId("CDWConfigNamespace").setValue(oData.namespace);
          that.getView().byId("CDWConfigSchema").setValue(oData.schema);
        })
        .fail(function ($jqXHR) {
          that._createAlertDialog(
            "HPH_CFG_GLOBAL_CONNECT_FAILED_TITLE",
            "HPH_CDW_META_DB_GET_FAILED_MESSAGE"
          );
        });
    };

    SettingsController.prototype.CDWMetadataConfigSave = function () {
      var that = this;
      var val1 = that.getView().byId("CDWConfigNamespace").getValue();
      var val2 = that.getView().byId("CDWConfigSchema").getValue();
      var checkValues = this.checkCDWInputValues(val1, val2);
      var returnValue;
      if (checkValues === false) {
        this._createAlertDialog(
          "HPH_CFG_GLOBAL_CONNECT_FAILED_TITLE",
          "HPH_CDW_META_DB_SET_FAILED_MESSAGE_TIP"
        );
        returnValue = false;
      } else {
        ConfigUtils.ajax(
          jQuery.extend(
            {
              type: "POST",
              url: "/hc/hph/config/services/cdwMetadataConfig.xsjs",
            },
            {
              data: JSON.stringify({
                action: "setGlobalSetting",
                data: {
                  namespace: val1,
                  schema: val2,
                },
              }),
            }
          )
        )
          .done(function (oData) {
            that.getView().byId("CDWConfigNamespace").setValue(val1);
            that.getView().byId("CDWConfigSchema").setValue(val2);
            returnValue = true;
          })
          .fail(function ($jqXHR) {
            that._createAlertDialog(
              "HPH_CFG_GLOBAL_CONNECT_FAILED_TITLE",
              "HPH_CDW_META_DB_SET_FAILED_MESSAGE"
            );
            returnValue = false;
          });
      }
      return returnValue;
    };

    SettingsController.prototype.checkCDWInputValues = function (val1, val2) {
      var validNamespaceExpression = /^([a-zA-Z0-9]+\.*\_*)+$/;
      var validSchemaExpression = /^([a-zA-Z0-9]+\_*)+$/;
      var namespaces = val1.split(",");
      var schemas = val2.split(",");
      for (var i = 0; i < namespaces.length; i++) {
        var match = namespaces[i].match(validNamespaceExpression);
        if (match) {
          //do nothing
        } else {
          return false;
        }
      }

      for (var i = 0; i < schemas.length; i++) {
        var match = schemas[i].match(validSchemaExpression);
        if (match) {
          //do nothing
        } else {
          return false;
        }
      }
      return true;
    };

    SettingsController.prototype.switchView = function (oEvent) {
      var selectedView = oEvent.oSource.getSelectedItem().getLabel();
      var displayModel = this.getView().getModel("displayModel");
      var displayModeldata = { selectedView: selectedView };
      this.getView().getModel("displayModel").setData(displayModeldata);
    };

    SettingsController.prototype.viewFormatter = function (
      viewLabel,
      displayModel
    ) {
      return displayModel === viewLabel;
    };

    SettingsController.prototype.addLanguage = function (oEvent) {
      var oData = this.globalSettingsModel.getData();
      oData.language.splice(oData.language.length, 0, "");
      this.globalSettingsModel.setData(oData);
      this.getView().setModel(this.globalSettingsModel, "globalSettingsModel");
    };

    SettingsController.prototype.deleteLanguage = function (oEvent) {
      var oPath = oEvent.oSource
        .getParent()
        .getBindingContext("globalSettingsModel")
        .getPath();
      var languageIndex = oPath.split("/")[2];
      var oData = this.globalSettingsModel.getData();
      oData.language.splice(languageIndex, 1);
      this.globalSettingsModel.setData(oData);
      this.getView().setModel(this.globalSettingsModel, "globalSettingsModel");
    };

    SettingsController.prototype.handleNavButtonPress = function () {
      sap.ushell.Container.getService(
        "CrossApplicationNavigation"
      ).backToPreviousApp();
    };

    SettingsController.prototype.resetErrors = function () {
      var that = this;
      var validationState = that.getView().getModel("validationState");
      that.errorList.forEach(function (row) {
        validationState.setProperty("/" + row, {
          class: "",
          message: "",
        });
      });

      this.errorList = [];
    };

    SettingsController.prototype.transformErrorMsg = function (msgList) {
      var that = this;
      var iterator = msgList.forEach(function (row) {
        that
          .getView()
          .getModel("validationState")
          .setProperty("/" + row.source, {
            class: "sapGlobalSettingBorderError",
            message: row.message,
          });
        that.errorList.push(row.source);
      });
    };

    SettingsController.prototype.saveConfig = function () {
      if (this.CDWMetadataConfigSave() === false) {
        return;
      }
      var that = this;
      var oData = this.globalSettingsModel.getData();
      this.resetErrors();

      var packedConfig = {
        tableMapping: oData.tableMapping,
        guardedTableMapping: {
          "@PATIENT": oData.guardedTableMapping["@PATIENT"],
        },
        language: oData.language,
        settings: oData.settings,
        others: oData.others,
        shared: oData.shared,
        configId: oData.configId,
      };

      packedConfig.settings.fuzziness = parseFloat(
        packedConfig.settings.fuzziness
      );
      BackendLinker.saveSettings(packedConfig, function (result, sData) {
        if (result === "error") {
          that._createAlertDialog(
            "HPH_CFG_GLOBAL_SAVE_FAILED_TITLE",
            "HPH_CFG_GLOBAL_SAVE_FAILED_MESSAGE",
            sData.messages ? ": " + JSON.stringify(sData.messages) : ""
          );
        } else {
          if (!sData.valid) {
            that.transformErrorMsg(sData.messages);
          } else {
            var setting = sData.result;
            var modelData = that.globalSettingsModel.getData();
            modelData.tableMapping = setting.tableMapping;
            modelData.guardedTableMapping = setting.guardedTableMapping;
            modelData.language = setting.language;
            modelData.settings = setting.settings;
            modelData.others = setting.others;
            modelData.shared = setting.shared;
            modelData.configId = setting.configId;
            that.globalSettingsModel.setData(modelData);
            that
              .getView()
              .setModel(that.globalSettingsModel, "globalSettingsModel");
            that.getAllColumns(setting.tableMapping);

            that._createAlertDialog(
              "HPH_CFG_GLOBAL_SAVE_SUCCESS_TITLE",
              "HPH_CFG_GLOBAL_SAVE_SUCCESS_MESSAGE"
            );
          }
        }
      });
    };

    SettingsController.prototype.setDefault = function () {
      var that = this;
      BackendLinker.loadDefaultSettings(function (result, oData) {
        if (result === "error") {
          that._createAlertDialog(
            "HPH_CFG_GLOBAL_CONNECT_FAILED_TITLE",
            "HPH_CFG_GLOBAL_CONNECT_FAILED_MESSAGE",
            oData ? ": " + oData : ""
          );
        } else {
          that.globalSettingsModel = new sap.ui.model.json.JSONModel({
            tableMapping: oData.tableMapping,
            guardedTableMapping: oData.guardedTableMapping,
            language: oData.language,
            others: oData.others,
            settings: oData.settings,
            shared: oData.shared,
            configId: oData.configId,
          });
          that
            .getView()
            .setModel(that.globalSettingsModel, "globalSettingsModel");
          that.getAllColumns(oData.tableMapping);
        }
      });
    };

    SettingsController.prototype._createAlertDialog = function (
      title,
      messageText,
      suffix
    ) {
      var that = this;
      var message = new sap.m.Text({
        //  text: that._getText(messageText) + msuffix
        text: that._getText(messageText),
      });
      MessageBox.alert(message, {
        title: that._getText(title),
        details: suffix,
      });
    };

    SettingsController.prototype._getText = function (message) {
      return this.getView().getModel("i18n")._oResourceBundle.getText(message);
    };

    SettingsController.prototype.changePlaceholder = function (oEvent) {
      var that = this;
      var dbObject = oEvent.getSource().getValue();
      var path = oEvent.oSource.mBindingInfos.value.binding.sPath;
      var key = path.match(/@[^.^\s]+/g);
      if (key) {
        BackendLinker.getColumns(dbObject, function (err, result) {
          that
            .getView()
            .getModel("tableColumns")
            .setProperty("/" + key, result);
        });
      }
    };

    SettingsController.prototype.getAllColumns = function (pholdertableMap) {
      var that = this;
      that
        .getView()
        .setModel(new sap.ui.model.json.JSONModel({}), "tableColumns");
      pholderKeys.forEach(function (key) {
        BackendLinker.getColumns(pholdertableMap[key], function (err, result) {
          that
            .getView()
            .getModel("tableColumns")
            .setProperty("/" + key, result);
        });
      });
    };

    SettingsController.prototype.columnFactory = function (sId, oContext) {
      var that = this;
      var column = oContext.getProperty("name");
      var value = column ? '"' + column + '"' : "";
      var itemControl = new sap.ui.core.Item(sId, {
        key: value,
        text: value,
      });

      return itemControl;
    };

    SettingsController.prototype.listEnabler = function (columns) {
      if (columns) {
        return columns.length > 0;
      }
      return false;
    };

    SettingsController.prototype.onAfterRendering = function () {
      var displayModeldata = {
        selectedView: this._getText(
          "HPH_CFG_GLOBAL_MAPPING_SETTINGS_SECTION_TAB"
        ),
      };
      this.getView().getModel("displayModel").setData(displayModeldata);
    };

    SettingsController.prototype.isNumber = function (evt) {
      var oSrc = evt.getSource();
      var match = oSrc.getValue().match(/^\d+(\.\d+)?$/) || [];

      if (match.length === 0) {
        oSrc.setValue("");
      } else {
        oSrc.setValue(match[0]);
      }
    };

    SettingsController.prototype.isValidDateFormat = function (evt) {
      var oSrc = evt.getSource();
      var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
        pattern: oSrc.getValue(),
      });
      try {
        oDateFormat.parse(oDateFormat.format(new Date()));
      } catch (err) {
        oSrc.setValue("YYYY-MM-dd");
      }
    };

    SettingsController.prototype.isValidTimeFormat = function (evt) {
      var oSrc = evt.getSource();
      var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
        pattern: "YYYY-MM-dd " + oSrc.getValue(),
      });
      try {
        oDateFormat.parse(oDateFormat.format(new Date()));
      } catch (err) {
        oSrc.setValue("HH:mm:ss");
      }
    };

    return SettingsController;
  }
);
