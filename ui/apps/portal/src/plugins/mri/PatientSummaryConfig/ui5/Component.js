jQuery.sap.registerModulePath("hc", "/hc"); // eslint-line global jQuery

// Load the Core library explicitly as we depend on it being loaded before initializing the Component.
sap.ui.getCore().loadLibrary("hc.hph.core.ui");

sap.ui.define(
  [
    "jquery.sap.global",
    "hc/hph/patient/config/ui/lib/BackendLinker",
    "hc/hph/patient/config/ui/lib/ConfigUtils",
    "sap/m/Button",
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/resource/ResourceModel",
  ],
  function (jQuery, BackendLinker, ConfigUtils, Button, UIComponent, JSONModel, ResourceModel) {
    "use strict";

    /**
     * Constructor for the Patient Summary Configuration Component.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * This Component is the starting point of the Patient Summary Configuration application.
     * @extends sap.ui.core.UIComponent
     * @alias hc.hph.patient.config.ui.Component
     */
    var Component = UIComponent.extend("hc.hph.patient.config.ui.Component", {
      metadata: {
        name: "HPH Patient Summary Application Config",
        version: "${version}",
        includes: ["css/style.css"],
        dependencies: {
          libs: [
            "hc.hph.core.ui",
            "hc.hph.patient.config.ui.lib",
            "sap.m",
            "sap.ui.commons",
            "sap.ui.core",
            "sap.ui.layout",
          ],
          ui5version: "1.52.17",
        },
        config: {
          fullWidth: true,
          titleResource: "HPH_PAT_CFG_TITLE_PATIENT_INSPECTOR_CONFIG",
          resourceBundle: "../i18n/text.properties",
          modulePath: "/hc/hph/patient/config/ui",
          configService: {
            modulePath: "/hc/hph/config",
            resourceBundle: "i18n/config.properties",
          },
        },
        rootView: "hc.hph.patient.config.ui.views.MainEditor",
      },
    });

    /**
     * Initialize the component.
     * @protected
     * @override
     */
    Component.prototype.init = function () {
      UIComponent.prototype.init.apply(this, arguments);

      var that = this;
      var mConfig = this.getMetadata().getConfig();

      this.aActionButtons = [];

      this.addHelpButton();
      // Resource bundle model for i18n:
      var oRBModel = new ResourceModel({
        bundleUrl: mConfig.modulePath + "/" + mConfig.resourceBundle,
      });

      oRBModel.enhance({
        bundleUrl: mConfig.configService.modulePath + "/" + mConfig.configService.resourceBundle,
      });

      this.setModel(oRBModel, "i18n");
      ConfigUtils.setResourceBundle(oRBModel.getResourceBundle());

      // load the constant resources
      BackendLinker.getStaticContent(function (status, mData) {
        if (status === "success") {
          that.setModel(new JSONModel(mData), "constantsModel");
        } else {
          ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "HPH_PAT_CFG_CONFIG_ERROR_IN_LOADING");
        }
      });
    };

    /**
     * Destruction of the UIComponent.
     * @override
     */
    Component.prototype.destroy = function () {
      sap.ui.core.UIComponent.prototype.destroy.apply(this, arguments);

      var oRendererExtensions = sap.ushell.renderers.fiori2.RendererExtensions;
      var mLaunchpadStates = oRendererExtensions.LaunchpadState;
      this.aActionButtons.forEach(function (oActionButton) {
        oRendererExtensions.removeOptionsActionSheetButton(oActionButton, mLaunchpadStates.App);
      });
    };
    /**
     * Add a button to the Launchpad ActionSheet
     * @param {sap.m.Button} oActionButton Button for the Launchpad ActionSheet
     */
    Component.prototype.addActionButton = function (oActionButton) {
      this.aActionButtons.push(oActionButton);
      if (sap.ushell) {
        var oRendererExtensions = sap.ushell.renderers.fiori2.RendererExtensions;
        var mLaunchpadStates = oRendererExtensions.LaunchpadState;
        oRendererExtensions.addOptionsActionSheetButton(oActionButton, mLaunchpadStates.App);
      }
    };
    /**
     * Adds a "Help" button to the actions in the options
     */
    Component.prototype.addHelpButton = function () {
      var sCoreI18nBundleURL = [jQuery.sap.getModulePath("hc.hph.core.ui"), "i18n/messagebundle.properties"].join(
        "/"
      );
      var oCorei18nResourceModel = new ResourceModel({
        bundleUrl: sCoreI18nBundleURL,
      });
      var oHelpButton = new Button({
        icon: "sap-icon://sys-help",
        text: oCorei18nResourceModel.getResourceBundle().getText("APPLICATION_HELP"),
        press: this.onHelpPressed,
      });
      this.addActionButton(oHelpButton);
    };
    /**
     * Handles the press event on the help button
     */
    Component.prototype.onHelpPressed = function () {
      var sUrl =
        "https://help.sap.com/viewer/fddd7c5de941469e9803c5a036d8d6ff/2.0.0/en-US/02180bc69fdc43a79f13a11e4a0a8c8c.html";
      window.open(sUrl, "_blank");
    };

    return Component;
  }
);
