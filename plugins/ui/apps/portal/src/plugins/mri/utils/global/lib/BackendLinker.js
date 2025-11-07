sap.ui.define(
  ["jquery.sap.global", "hc/hph/cdw/config/ui/lib/ConfigUtils"],
  function (jQuery, ConfigUtils) {
    "use strict";

    var BackendLinker = sap.ui.base.Object.extend(
      "hc.hph.config.global.ui.lib.BackendLinker"
    );

    BackendLinker._postJson = function (oSettings, fCallback) {
      ConfigUtils.ajax(
        jQuery.extend(
          {
            url: "/hc/hph/config/services/global.xsjs",
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
          fCallback("error", $jqXHR.responseJSON);
        });
    };

    BackendLinker.loadSettings = function (callback) {
      this._postJson(
        {
          data: JSON.stringify({
            action: "loadGlobalSettings",
          }),
        },
        callback
      );
    };

    BackendLinker.loadDefaultSettings = function (callback) {
      this._postJson(
        {
          data: JSON.stringify({
            action: "getDefaultSettings",
          }),
        },
        callback
      );
    };

    BackendLinker.saveSettings = function (oSettings, callback) {
      this._postJson(
        {
          data: JSON.stringify({
            action: "setGlobalSettings",
            settings: oSettings,
          }),
        },
        callback
      );
    };

    return BackendLinker;
  }
);
