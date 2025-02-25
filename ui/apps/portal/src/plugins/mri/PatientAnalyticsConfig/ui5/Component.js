jQuery.sap.registerModulePath("hc", "/hc");

// Load the Core library explicitly as we depend on it being loaded before initializing the Component.
sap.ui.getCore().loadLibrary("hc.hph.core.ui");

sap.ui.define(
  [
    "jquery.sap.global",
    "hc/mri/pa/config/ui/lib/ConfigUtils",
    "sap/ui/core/UIComponent",
    "sap/ui/core/IconPool",
    "sap/ui/model/resource/ResourceModel",
  ],
  function (jQuery, ConfigUtils, UIComponent, IconPool, ResourceModel) {
    "use strict";

    var Component = UIComponent.extend("hc.mri.pa.config.ui.Component", {
      metadata: {
        name: "Mri Application Config",
        version: "${version}",
        dependencies: {
          libs: [
            "hc.hph.core.ui",
            "hc.mri.pa.config.ui.lib",
            "sap.m",
            "sap.ui.commons",
            "sap.ui.core",
            "sap.ui.layout",
            "sap.ui.unified",
            "sap.ui.ux3",
            "sap.ui.table",
          ],
          ui5version: "1.44.12",
        },
        config: {
          fullWidth: true,
          titleResource: "MRI_PA_CFG_TITLE_PATIENT_ANALYTICS_CONFIG",
          resourceBundle: "i18n/text.properties",
          configService: {
            modulePath: "/hc/hph/config",
            resourceBundle: "i18n/text.properties",
          },
        },
        rootView: "hc.mri.pa.config.ui.views.MainEditor",
      },
    });

    /**
     * Initialize the component.
     * @override
     */
    Component.prototype.init = function () {
      UIComponent.prototype.init.apply(this, arguments);
      var mConfig = this.getMetadata().getConfig();
      // Resource bundle model for i18n:
      var oRBModel = new ResourceModel({
        bundleUrl: `/hc/mri/pa/config/ui/${mConfig.resourceBundle}`,
      });
      oRBModel.enhance({
        bundleUrl: mConfig.configService.modulePath + "/" + mConfig.configService.resourceBundle,
      });
      this.setModel(oRBModel, "i18n");
      ConfigUtils.setResourceBundle(oRBModel.getResourceBundle());

      this._fnAddHelpLink();

      [
        ["km-chart", "f000"],
        ["boxplot-chart", "f001"],
        ["x3-axis", "f002"],
        ["x2-axis", "f003"],
        ["x-axis", "f004"],
        ["x1-axis", "f005"],
        ["y-axis", "f006"],
        ["bool-or", "f007"],
        ["bool-and", "f008"],
        ["checkbox-unchecked", "f009"],
        ["checkbox-checked", "f010"],
      ].forEach(function (aIconDefinition) {
        IconPool.addIcon(aIconDefinition[0], "MRI", {
          fontFamily: "SAP-MRI-icons",
          content: aIconDefinition[1],
        });
      });
      [["dna", "f000"]].forEach(function (aIconDefinition) {
        IconPool.addIcon(aIconDefinition[0], "FFH", {
          fontFamily: "SAP-FFH-icons",
          content: aIconDefinition[1],
        });
      });
    };

    Component.prototype._fnAddHelpLink = function () {
      var oCorei18nResourceModel = new ResourceModel({
        bundleUrl: [jQuery.sap.getModulePath("hc.hph.core.ui"), "i18n/messagebundle.properties"].join("/"),
      });
      if (sap.ushell && sap.ushell.renderers) {
        var oRenderer = sap.ushell.renderers.fiori2.RendererExtensions;
        this._oHelpLink = new sap.m.Button({
          icon: "sap-icon://sys-help",
          text: oCorei18nResourceModel.getResourceBundle().getText("APPLICATION_HELP"),
          press: [
            function () {
              var sUrl =
                "https://help.sap.com/viewer/6277ccd6bd38468f97641fbadd3bf194/3.0.0/en-US/2180c5036cc54f60bd44ea4f02bf0daf.html";
              window.open(sUrl, "_blank");
            },
            this,
          ],
        });
        oRenderer.addOptionsActionSheetButton(this._oHelpLink, oRenderer.LaunchpadState.App);
      }
    };

    /**
     * Cleans up the Component instance before destruction.
     * Removes the Help Button from the Launchpad ActionSheet.
     * @override
     */
    Component.prototype.exit = function () {
      if (sap.ushell && sap.ushell.renderers) {
        var oRendererExtensions = sap.ushell.renderers.fiori2.RendererExtensions;
        oRendererExtensions.removeOptionsActionSheetButton(this._oHelpLink, oRendererExtensions.LaunchpadState.App);
      }
    };

    return Component;
  }
);
