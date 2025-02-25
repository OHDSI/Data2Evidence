sap.ui.define(["sap/m/library", "sap/ui/core/library"], function () {
  "use strict";

  // sap.ui.getCore().setThemeRoot("sap_belize", ["hc.hph.patient.app.ui.lib"], "");
  sap.ui.getCore().setThemeRoot("sap_bluecrystal", ["hc.hph.patient.app.ui.lib"], "");
  // sap.ui.getCore().setThemeRoot("sap_hcb", ["hc.hph.patient.app.ui.lib"], "");

  /**
   * SAPUI5 library for FFH Patient Summary Configuration.
   *
   * @namespace
   * @name hc.hph.patient.config.ui.lib
   */
  sap.ui.getCore().initLibrary({
    name: "hc.hph.patient.config.ui.lib",
    version: "1.0.0",
    dependencies: ["sap.m", "sap.ui.core"],
    types: [],
    interfaces: [],
    controls: [
      "hc.hph.patient.config.ui.lib.SortedMultiComboBox",
      "hc.hph.patient.config.ui.lib.PlottableAttributesFormLayout",
      "hc.hph.patient.config.ui.lib.EnterAwareInput",
    ],
    elements: [
      "hc.hph.patient.config.ui.lib.BackendLinker",
      "hc.hph.patient.config.ui.lib.ConfigUpgrade",
      "hc.hph.patient.config.ui.lib.ConfigUtils",
      "hc.hph.patient.config.ui.lib.Formatter",
      "hc.hph.patient.config.ui.lib.PlottableAttributesFormElement",
    ],
  });

  return hc.hph.patient.config.ui.lib;
});
