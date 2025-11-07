/* global jQuery, sap */
/* eslint-disable */
jQuery.sap.registerModulePath("sap.hc", "/sap/hc");
sap.ui.getCore().loadLibrary("sap.hc.hph.core.ui");

sap.ui.define(
  [
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig",
    "sap/m/MessageBox",
    "sap/ui/core/IconPool",
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/resource/ResourceModel"
  ],
  function(
    jQuery,
    Utils,
    MriFrontendConfig,
    MessageBox,
    IconPool,
    UIComponent,
    JSONModel,
    ResourceModel
  ) {
    return {
      setup: function(componentName, metadata, disableEulaCheck) {
        /**
         * Constructor for the MRI Patient Analytics Component.
         * @constructor
         * @param {string} [sId]       id for the new control, generated automatically if no id is given
         * @param {object} [mSettings] initial settings for the new control
         *
         * @classdesc
         * This Component is the starting point of the Patient Analytics application.
         * @extends sap.ui.core.UIComponent
         * @alias sap.hc.mri.pa.ui.Component
         */

        var eventBus = sap.ui.getCore().getEventBus();

        var Component = UIComponent.extend(componentName, metadata);

        /**
         * Initialize the component.
         * @override
         * @protected
         */
        Component.prototype.init = function() {
          UIComponent.prototype.init.apply(this, arguments);

          // Model to track config id
          this.oConfigDialogModel = new JSONModel({});
          this.setModel(this.oConfigDialogModel, "ConfigDialogModel");
          var that = this;
          var oResourceModel = new ResourceModel({
            bundleUrl:
              jQuery.sap.getModulePath("sap.hc.mri.pa.ui") +
              "/" +
              this.getMetadata().getConfig().resourceBundle
          });

          this.setModel(oResourceModel, "i18n");
          Utils.setResourceBundle(oResourceModel.getResourceBundle());

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
            ["checkbox-checked", "f010"]
          ].forEach(function(aIconDefinition) {
            IconPool.addIcon(aIconDefinition[0], "MRI", {
              fontFamily: "SAP-MRI-icons",
              content: aIconDefinition[1]
            });
          });
          [["dna", "f000"]].forEach(function(aIconDefinition) {
            IconPool.addIcon(aIconDefinition[0], "FFH", {
              fontFamily: "SAP-FFH-icons",
              content: aIconDefinition[1]
            });
          });

          this._fnAddHelpLink();

         
          if (disableEulaCheck) {
            that._loadApplication();
          } else {
            this._checkEula()
              .done(function() {
                that._loadApplication();
              })
              .fail(this._navigateToFlp);
          }

          eventBus.subscribe("VUE_NAVIGATE_FLP", this._navigateToFlp);
        };

        /**
         * Cleans up the Component instance before destruction.
         * Removes the Settings Button from the Launchpad ActionSheet.
         * @override
         */
        Component.prototype.exit = function() {
          var oRendererExtensions =
          sap.ushell.renderers.fiori2.RendererExtensions;

          oRendererExtensions.removeOptionsActionSheetButton(this._oHelpLink, oRendererExtensions.LaunchpadState.App);

          eventBus.unsubscribe("VUE_NAVIGATE_FLP", this._navigateToFlp);
          if (window.destroyMri) {
            window.destroyMri();
          }
        };

        /**
         * Loads the available configurations into the dialog and opens it.
         * Used by SETTINGS button in the app.
         * @private
         */
        Component.prototype._reloadConfigurations = function() {
          eventBus.publish("VUE_TOGGLE_CONFIG_SELECTION");
        };

        /**
         * Loads the application with a given configuration.
         * Is used as callback to pause initialization of the application during the configuration check and optional
         * configuration selection.
         * @private
         * @param {Object} mConfig Mri config object
         */
        Component.prototype._loadApplication = function(mConfig) {
          // MriFrontendConfig.createFrontendConfig(mConfig);
          this.getRouter().initialize();
        };

        /**
         * Checks if the EULA has been accepted. If not, the EULA dialog is displayed.
         * @returns {jQuery.Deferred} Deferred object being rejected if EULA is declined, and resolved if
         * EULA is accepted [or was already accepted in the past]
         * @private
         */
        Component.prototype._checkEula = function() {
          if (!this._$EulaPromise) {
            var that = this;
            this._$EulaPromise = new jQuery.Deferred(function($deferred) {
              that._getEulaComponent(function(EulaComponent) {
                var oEulaComponent = new EulaComponent();
                oEulaComponent.checkEula({
                  accept: function() {
                    $deferred.resolve();
                  },
                  declined: function() {
                    $deferred.reject();
                  }
                });
              });
            }).promise();
          }
          return this._$EulaPromise;
        };

        /**
         * Get the EULA component (it was already loaded through the preload mechanism)
         * @param {function} fCallback The callback to be called with the EulaComponent constructor as parameter
         * @private
         */
        Component.prototype._getEulaComponent = function(fCallback) {
          sap.ui.require(
            ["sap/hc/hph/eula/ui/components/acceptEula/Component"],
            fCallback
          );
        };

        /**
         * Handler for the Config Selection Dialog Cancel Button press.
         * @param {sap.ui.base.Event} oEvent Button Press Event
         */
        Component.prototype.onClosePressed = function(oEvent) {
          oEvent
            .getSource()
            .getParent()
            .getParent()
            .close();
        };

        /**
         * Handler for the Config Selection Dialog close.
         * Is called if the Config Selection Dialog is closed without selecting a config.
         * Navigates to the launchpad if no config has been selected.
         */
        Component.prototype.onDialogClose = function() {
          // if (typeof MriFrontendConfig.getFrontendConfig() !== "object") {
          this._navigateToFlp();
          //}
        };

        Component.prototype._fnAddHelpLink = function() {
          var oCorei18nResourceModel = new ResourceModel({
            bundleUrl: [
              jQuery.sap.getModulePath("sap.hc.hph.core.ui"),
              "i18n/messagebundle.properties"
            ].join("/")
          });
          if (sap.ushell && sap.ushell.renderers) {
            var oRenderer = sap.ushell.renderers.fiori2.RendererExtensions;
            var language_complete = sap.ui.getCore().getConfiguration().getLocale().getLanguage();
            var language = language_complete.substring(0, 2).toLowerCase();
            this._oHelpLink = new sap.m.Button({
              icon: "sap-icon://sys-help",
              text: oCorei18nResourceModel
                .getResourceBundle()
                .getText("APPLICATION_HELP"),
              press: [
                function() {
                  var sUrl =
                    "https://help.sap.com/viewer/40f0b71017734398949a57f0ba0ee839/3.0.0/en-US/3b70695dc8e24efd94d987167978bd7d.html";
                  if (
                    language === "en-US" ||
                    language === "en-GB" ||
                    language === "en"
                  ) {
                    sUrl =
                      "https://help.sap.com/viewer/40f0b71017734398949a57f0ba0ee839/3.0.0/en-US/3b70695dc8e24efd94d987167978bd7d.html";
                  } else if (language === "de-DE" || language === "de") {
                    sUrl =
                      "https://help.sap.com/viewer/40f0b71017734398949a57f0ba0ee839/3.0.0/de-DE/3b70695dc8e24efd94d987167978bd7d.html";
                  } else if (language === "fr-FR" || language === "fr") {
                    sUrl =
                      "https://help.sap.com/viewer/40f0b71017734398949a57f0ba0ee839/3.0.0/fr-FR/3b70695dc8e24efd94d987167978bd7d.html";
                  } else if (language === "zh-CN" || language === "zh") {
                    sUrl =
                      "https://help.sap.com/viewer/40f0b71017734398949a57f0ba0ee839/3.0.0/zh-CN/3b70695dc8e24efd94d987167978bd7d.html";
                  } else if (language === "pt-PT" || language === "pt") {
                    sUrl =
                      "https://help.sap.com/viewer/40f0b71017734398949a57f0ba0ee839/3.0.0/pt-BR/3b70695dc8e24efd94d987167978bd7d.html";
                  } else if (language === "es-ES" || language === "es") {
                    sUrl =
                      "https://help.sap.com/viewer/40f0b71017734398949a57f0ba0ee839/3.0.0/es-ES/3b70695dc8e24efd94d987167978bd7d.html";
                  }
                  window.open(sUrl, "_blank");
                },
                this
              ]
            });
            oRenderer.addOptionsActionSheetButton(
              this._oHelpLink,
              oRenderer.LaunchpadState.App
            );
          }
        };

        Component.prototype._navigateToFlp = function() {
          // Running in shell should navigate back to Launchpad entry
          if (sap.ushell) {
            sap.ushell.Container.getService(
              "CrossApplicationNavigation"
            ).toExternal({
              target: {
                shellHash: ""
              }
            });
          }
        };

        return Component;
      }
    };
  }
);
