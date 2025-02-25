sap.ui.define(["jquery.sap.global", "./ConfigUtils"], function (jQuery, ConfigUtils) {
  "use strict";

  /**
   * Helper class to isolate all backend requests.
   * @namespace
   * @alias hc.hph.patient.config.ui.lib.BackendLinker
   */
  var BackendLinker = {};

  /**
   * Get a Template.
   * @param {sap.ui.model.json.JSONModel} oAnalyticsModel  Model with UI data
   * @param {string}                      sDmConfigId      Datamodel config id
   * @param {string}                      sDmConfigVersion Datamodel config version
   * @param {function}                    fCallback        Callback function
   */
  BackendLinker.getTemplate = function (oAnalyticsModel, sDmConfigId, sDmConfigVersion, fCallback) {
    var sPath = "/dmConfigList/" + sDmConfigId + "/versions/" + sDmConfigVersion;
    var oConfigVersionObject = oAnalyticsModel.getProperty(sPath);
    if (!oConfigVersionObject.laneTemplate || !oConfigVersionObject.masterdataAttributes) {
      this._postJson(
        {
          data: JSON.stringify({
            action: "getTemplateData",
            dependentConfig: {
              configId: sDmConfigId,
              configVersion: sDmConfigVersion,
            },
          }),
        },
        function (sResult, oData) {
          oAnalyticsModel.setProperty(sPath + "/laneTemplate", oData.laneTemplate);
          oAnalyticsModel.setProperty(sPath + "/masterdataAttributes", oData.masterdataAttributes);
          if (fCallback) {
            fCallback(sResult, oData);
          }
        }
      );
    } else {
      var oData = {
        laneTemplate: oAnalyticsModel.getProperty(sPath + "/laneTemplate"),
        masterdataAttributes: oAnalyticsModel.getProperty(sPath + "/masterdataAttributes"),
      };
      if (fCallback) {
        fCallback("success", oData);
      }
    }
  };

  /**
   * POST json data to the backend.
   * @private
   * @param {object}   oSettings Settings object
   * @param {function} fCallback Callback function
   */
  BackendLinker._postJson = function (oSettings, fCallback) {
    ConfigUtils.ajax(
      jQuery.extend(
        {
          url: "/ps-config-svc/hc/hph/patient/config/services/config.xsjs",
          type: "POST",
          dataType: "json",
          contentType: "application/json; charset=utf-8",
        },
        oSettings
      )
    )
      .done(function (oData) {
        fCallback("success", oData);
      })
      .fail(function ($jqXHR) {
        fCallback("error", $jqXHR.responseText);
      });
  };

  /**
   * Get the currently available tab extensions
   * @param {sap.ui.model.json.JSONModel} oAnalyticsModel  Model with UI data
   * @param {function} callback Callback function when request completes
   */
  BackendLinker.getExtensions = function (oAnalyticsModel, callback) {
    var sPropertyPath = "/extensions";
    var aExtensions = oAnalyticsModel.getProperty(sPropertyPath);
    if (Array.isArray(aExtensions)) {
      callback("success", aExtensions);
    } else {
      this._postJson(
        {
          data: JSON.stringify({
            action: "getExtensions",
          }),
        },
        function (sState, oData) {
          if (sState === "success") {
            oAnalyticsModel.setProperty(sPropertyPath, oData);
          }
          callback(sState, oData);
        }
      );
    }
  };
  /**
   * Get the configuration defined by the given meta data.
   * @param {object}   meta     Configuration meta information with configId and configVersion
   * @param {function} callback Callback function when request completes
   */
  BackendLinker.getConfig = function (meta, callback) {
    this._postJson(
      {
        data: JSON.stringify({
          action: "getAdminConfig",
          configId: meta.configId,
          configVersion: meta.configVersion,
        }),
      },
      callback
    );
  };

  /**
   * Request all configurations.
   * @param {function} callback Callback function with configuration data
   */
  BackendLinker.getAllConfigs = function (callback) {
    this._postJson(
      {
        data: JSON.stringify({
          action: "getAll",
        }),
      },
      callback
    );
  };

  /**
   * Get an empty configuration object synchronously.
   * @returns {object} Empty configuration object
   */
  BackendLinker.getEmptyConfig = function () {
    return {
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
        tabExtensions: [],
        widgetExtensions: [],
      },
      configInformations: {
        note: "",
      },
      lanes: [],
    };
  };

  /**
   * Get the static content of the configuration.
   * @param {function} callback Callback function
   */
  BackendLinker.getStaticContent = function (callback) {
    this._postJson(
      {
        data: JSON.stringify({
          action: "getStaticContent",
        }),
      },
      callback
    );
  };

  /**
   * Validate the given configuration based on its dependent configuration.
   * @param {object}   config   Configuration object
   * @param {object}   meta     Configuration meta information with dependentConfig
   * @param {function} callback Callback function when request completes
   */
  BackendLinker.validateConfig = function (config, meta, callback) {
    this._postJson(
      {
        data: JSON.stringify({
          action: "validate",
          config: config,
          dependentConfig: meta.dependentConfig,
        }),
      },
      callback
    );
  };

  /**
   * Activate the given configuration based on its dependent configuration.
   * @param {object}   config   Configuration object
   * @param {object}   meta     Configuration meta information with configId, configVersion, and dependentConfig
   * @param {function} callback Callback function when request completes
   */
  BackendLinker.activateConfig = function (config, meta, callback) {
    this._postJson(
      {
        data: JSON.stringify({
          action: "activate",
          config: config,
          configId: meta.configId,
          configName: meta.configName,
          dependentConfig: meta.dependentConfig,
        }),
      },
      callback
    );
  };

  /**
   * Export the given configuration.
   * @param {object}   meta     Configuration meta information with configId and configVersion
   * @returns {string}          Config download link
   */
  BackendLinker.getConfigDownloadLink = function (meta) {
    var url = "/ps-config-svc/hc/hph/patient/config/services/config.xsjs";
    url += "?action=export";
    url += "&configId=" + meta.configId;
    url += "&configVersion=" + meta.configVersion;
    return url;
  };

  /**
   * Delete the configuration defined by the given meta data.
   * @param {object}   meta     Configuration meta information with configId and configVersion
   * @param {function} callback Callback function when request completes
   */
  BackendLinker.deleteConfig = function (meta, callback) {
    this._postJson(
      {
        data: JSON.stringify({
          action: "delete",
          configId: meta.configId,
          configVersion: meta.configVersion,
        }),
      },
      callback
    );
  };

  return BackendLinker;
});
