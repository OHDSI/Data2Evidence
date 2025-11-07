sap.ui.define(
  ["jquery.sap.global", "sap/m/library", "sap/ui/core/library"],
  function () {
    "use strict";
    sap.ui
      .getCore()
      .setThemeRoot("sap_bluecrystal", ["hc.hph.core.ui"], "");
    /**
     * SAPUI5 library for FFH Core.
     *
     * @namespace
     * @name hc.hph.core.ui
     */
    sap.ui.getCore().initLibrary({
      name: "hc.hph.core.ui",
      version: "1.0.0",
      dependencies: ["sap.m", "sap.ui.core"],
      types: ["hc.hph.core.ui.FioriUtils.DensityClass"],
      interfaces: [],
      controls: ["hc.hph.core.ui.ConfigDialog"],
      elements: [
        "hc.hph.core.ui.AjaxUtils",
        "hc.hph.core.ui.DateUtils",
        "hc.hph.core.ui.FioriUtils",
        "hc.hph.core.ui.HPHFormatter",
        "hc.hph.core.ui.JSONUtils",
        "hc.hph.core.ui.MessageBox",
        "hc.hph.core.ui.ScopedUtils",
        "hc.hph.core.ui.TextUtils",
        "hc.hph.core.ui.TimeoutHandler",
        "hc.hph.core.ui.UserPrefsUtils",
        "hc.hph.core.ui.XsrfHandler",
        "hc.hph.core.ui.odata.ODataModel",
      ],
    });
    return hc.hph.core.ui;
  }
);
