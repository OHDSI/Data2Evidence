jQuery.sap.registerModulePath("hc", "/sap/hc");

sap.ui.define(
  [
    "jquery.sap.global",
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/IconPool",
    "sap/ui/model/resource/ResourceModel",
  ],
  function (jQuery, UIComponent, JSONModel, IconPool, ResourceModel) {
    "use strict";

    var Component = UIComponent.extend(
      "hc.hph.config.global.ui.Component",
      {
        metadata: {
          name: "HPH GlobalConfig",
          version: "${version}",
          includes: ["styles/style.css"],
          dependencies: {
            libs: [
              "hc.hph.config.global.ui.lib",
              "sap.m",
              "sap.ui.commons",
              "sap.ui.core",
              "sap.ui.layout",
              "sap.ui.unified",
              "sap.ui.ux3",
              "sap.ui.table",
            ],
            ui5version: "1.28.3",
          },
          config: {
            fullWidth: true,
            titleResource: "HPH_CFG_GLOBAL_TITLE_CONFIG_SETTINGS",
            resourceBundle: "i18n/global.properties",
            modulePath: "/hc/hph/config/global/ui",
            configService: {
              modulePath: "/hc/hph/config",
              resourceBundle: "i18n/global.properties",
            },
          },
          rootView: "hc.hph.config.global.ui.views.App",
        },
      }
    );
    /**
     * Initialize the component.
     * @override
     */
    Component.prototype.init = function () {
      UIComponent.prototype.init.apply(this, arguments);

      // ----
      // Resource bundle model for i18n:
      var oRBModel = new ResourceModel({
        bundleUrl:
          this.getMetadata().getConfig().modulePath +
          "/" +
          this.getMetadata().getConfig().resourceBundle,
      });

      oRBModel.enhance({
        bundleUrl:
          this.getMetadata().getConfig().configService.modulePath +
          "/" +
          this.getMetadata().getConfig().configService.resourceBundle,
      });

      this.setModel(oRBModel, "i18n");

      var defaultValidationState = {
        guardedTableMapping: {
          "@PATIENT": { class: "", message: "" },
        },
        settings: {
          csvDelimiter: { class: "", message: "" },
        },
        otsTableMap: {
          "@CODE": { class: "", message: "" },
        },
        tableMapping: {
          "@INTERACTION": { class: "", message: "" },
          "@OBS": { class: "", message: "" },
          "@CODE": { class: "", message: "" },
          "@MEASURE": { class: "", message: "" },
          "@REF": { class: "", message: "" },
          "@PATIENT": { class: "", message: "" },
          "@TEXT": { class: "", message: "" },
          "@INTERACTION.PATIENT_ID": { class: "", message: "" },
          "@INTERACTION.INTERACTION_ID": { class: "", message: "" },
          "@INTERACTION.CONDITION_ID": { class: "", message: "" },
          "@INTERACTION.PARENT_INTERACT_ID": { class: "", message: "" },
          "@INTERACTION.START": { class: "", message: "" },
          "@INTERACTION.END": { class: "", message: "" },
          "@OBS.PATIENT_ID": { class: "", message: "" },
          "@OBS.OBSERVATION_ID": { class: "", message: "" },
          "@CODE.INTERACTION_ID": { class: "", message: "" },
          "@MEASURE.INTERACTION_ID": { class: "", message: "" },
          "@REF.VOCABULARY_ID": { class: "", message: "" },
          "@REF.CODE": { class: "", message: "" },
          "@REF.TEXT": { class: "", message: "" },
          "@TEXT.INTERACTION_TEXT_ID": { class: "", message: "" },
          "@TEXT.INTERACTION_ID": { class: "", message: "" },
          "@TEXT.VALUE": { class: "", message: "" },
          "@PATIENT.PATIENT_ID": { class: "", message: "" },
          "@PATIENT.DOD": { class: "", message: "" },
          "@PATIENT.DOB": "",
        },
      };

      this.setModel(new JSONModel(defaultValidationState), "validationState");

      this._fnAddHelpLink();
    };

    Component.prototype._fnAddHelpLink = function () {
      var oCorei18nResourceModel = new ResourceModel({
        bundleUrl: [
          jQuery.sap.getModulePath("hc.hph.core.ui"),
          "i18n/messagebundle.properties",
        ].join("/"),
      });
      if (sap.ushell && sap.ushell.renderers) {
        var oRenderer = sap.ushell.renderers.fiori2.RendererExtensions;
        this._oHelpLink = new sap.m.Button({
          icon: "sap-icon://sys-help",
          text: oCorei18nResourceModel
            .getResourceBundle()
            .getText("APPLICATION_HELP"),
          press: [
            function () {
              var sUrl =
                "https://help.sap.com/viewer/fddd7c5de941469e9803c5a036d8d6ff/1.0.5/en-US/8d790097b7634380930a01776667f9da.html";
              window.open(sUrl, "_blank");
            },
            this,
          ],
        });
        oRenderer.addOptionsActionSheetButton(
          this._oHelpLink,
          oRenderer.LaunchpadState.App
        );
      }
    };

    /**
     * Cleans up the Component instance before destruction.
     * Removes the Help Button from the Launchpad ActionSheet.
     * @override
     */
    Component.prototype.exit = function () {
      var oRendererExtensions = sap.ushell.renderers.fiori2.RendererExtensions;
      oRendererExtensions.removeOptionsActionSheetButton(
        this._oHelpLink,
        oRendererExtensions.LaunchpadState.App
      );
    };

    return Component;
  }
);
