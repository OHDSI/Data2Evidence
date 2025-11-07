jQuery.sap.registerModulePath("sap.hc", "/sap/hc");

// Load the Core library explicitly as we depend on it being loaded before initializing the Component.
sap.ui.getCore().loadLibrary("sap.hc.hph.core.ui");

sap.ui.define([
    "jquery.sap.global",
    'sap/hc/mri/pa/ui/Utils',
    'sap/hc/mri/pa/ui/lib/MriFrontendConfig',
    "sap/m/MessageBox",
    "sap/ui/core/IconPool",
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/resource/ResourceModel"
], function (jQuery, Utils, MriFrontendConfig, MessageBox, IconPool, UIComponent, JSONModel, ResourceModel) {
    "use strict";

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
    var Component = UIComponent.extend("sap.hc.mri.pa.ui.v1.Component", {
        metadata: {
            name: "mri.pa",
            version: "${version}",
            includes: [
                "../css/style.css"
            ],
            dependencies: {
                libs: [
                    "sap.hc.hph.core.ui",
                    "sap.hc.mri.pa.ui.lib",
                    "sap.m",
                    "sap.ui.commons",
                    "sap.ui.core",
                    "sap.ui.layout",
                    "sap.ui.table",
                    "sap.viz"
                ],
                components: [
                    "sap.hc.hph.eula.ui.components.acceptEula"//,
                    //"sap.hc.hph.patient.app.ui.content"//,
                    //"sap.hc.mri.pa.ui.collection"
                ],
                ui5version: "1.28.29"
            },
            config: {
                fullWidth: true,
                resourceBundle: "i18n/text.properties"
            },
            rootView: "sap.hc.mri.pa.ui.views.App",
            routing: {
                config: {
                    routerClass: sap.m.routing.Router,
                    viewType: "XML",
                    viewPath: "sap.hc.mri.pa.ui.views",
                    controlId: "appControl",
                    controlAggregation: "pages",
                    bypassed: {
                        target: "main"
                    }
                },
                routes: {
                    main: {
                        pattern: "",
                        target: "main"
                    }
                },
                targets: {
                    main: {
                        viewName: "PatientAnalytics"
                    }
                }
            }
        }
    });

    /**
     * Initialize the component.
     * @override
     * @protected
     */
    Component.prototype.init = function () {
        UIComponent.prototype.init.apply(this, arguments);

        // Model to track config id
        this.oConfigDialogModel = new JSONModel({});
        this.setModel(this.oConfigDialogModel, "ConfigDialogModel");

        var oResourceModel = new ResourceModel({
            bundleUrl: jQuery.sap.getModulePath("sap.hc.mri.pa.ui") + "/" + this.getMetadata().getConfig().resourceBundle
        });
        this.setModel(oResourceModel, "i18n");
        Utils.setResourceBundle(oResourceModel.getResourceBundle());

        // Create the Settings Button to change the config and add it to the Launchpad ActionSheet
        this._oSettingsButton = new sap.m.Button({
            icon: "sap-icon://action-settings",
            text: oResourceModel.getResourceBundle().getText("MRI_PA_SETTINGS"),
            press: [function () {
                this._reloadConfigurations();
            }, this]
        });
        if (sap.ushell) {
            var oRendererExtensions = sap.ushell.renderers.fiori2.RendererExtensions;
            oRendererExtensions.addOptionsActionSheetButton(this._oSettingsButton, oRendererExtensions.LaunchpadState.App);
        }
        [
            ["km-chart", "f000"], ["boxplot-chart", "f001"], ["x3-axis", "f002"], ["x2-axis", "f003"],
            ["x-axis", "f004"], ["x1-axis", "f005"], ["y-axis", "f006"], ["bool-or", "f007"],
            ["bool-and", "f008"], ["checkbox-unchecked", "f009"], ["checkbox-checked", "f010"]
        ].forEach(function (aIconDefinition) {
            IconPool.addIcon(aIconDefinition[0], "MRI", {
                fontFamily: "SAP-MRI-icons",
                content: aIconDefinition[1]
            });
        });
        [
            ["dna", "f000"]
        ].forEach(function (aIconDefinition) {
            IconPool.addIcon(aIconDefinition[0], "FFH", {
                fontFamily: "SAP-FFH-icons",
                content: aIconDefinition[1]
            });
        });

        this._fnAddHelpLink();

        var that = this;
        this._checkEula().done(function () {
            that._checkConfig();
        }).fail(this._navigateToFlp);
    };

    Component.prototype._checkConfig = function () {
        var that = this;
        this.oConfigSelectionDialog = sap.ui.xmlfragment("sap.hc.mri.pa.ui.views.ConfigSelectionDialog", this);
        this.oConfigSelectionDialog.addStyleClass(Utils.getContentDensityClass());

        Utils.ajax("/sap/hc/mri/pa/services/analytics.xsjs?action=getMyConfig").done(jQuery.proxy(function (aData) {
            var oResourceModel = this.getModel("i18n");
            if (aData.length === 0) {
                MessageBox.show(oResourceModel.getResourceBundle().getText("MRI_PA_NO_CONFIG_ASSIGNED"), {
                    icon: MessageBox.Icon.ERROR,
                    styleClass: Utils.getContentDensityClass(),
                    title: oResourceModel.getResourceBundle().getText("MRI_PA_NOTIFICATION_ERROR"),
                    onClose: function () {
                        sap.ushell.Container.getService("CrossApplicationNavigation").toExternal({
                            target: {
                                shellHash: ""
                            }
                        });
                    }
                });
            } else if (aData.length > 1) {
                // Pre-select the first configuration
                aData[0].selected = true;
                this.oConfigSelectionDialog.setModel(new JSONModel({
                    configs: aData,
                    default: false
                }));
                this.oConfigSelectionDialog.setModel(oResourceModel, "i18n");
                this.oConfigSelectionDialog.open();
            } else {
                // Save current config id
                that.oConfigDialogModel.setProperty("/currentConfigId", aData[0].meta.configId, true);
                this._loadApplication(aData[0]);
            }
        }, this)).fail(function (jqXHR) {
            Utils.notifyUser("Error", jqXHR.responseJSON || "NOTIFICATION_FATAL", function () {
                if (sap.ushell) {
                    sap.ushell.Container.getService("CrossApplicationNavigation").toExternal({
                        target: {
                            shellHash: ""
                        }
                    });
                }
            });
        });
    };

    /**
     * Cleans up the Component instance before destruction.
     * Removes the Settings Button from the Launchpad ActionSheet.
     * @override
     */
    Component.prototype.exit = function () {
        var oRendererExtensions = sap.ushell.renderers.fiori2.RendererExtensions;
        oRendererExtensions.removeOptionsActionSheetButton(this._oSettingsButton, oRendererExtensions.LaunchpadState.App);
        oRendererExtensions.removeOptionsActionSheetButton(this._oHelpLink, oRendererExtensions.LaunchpadState.App);
    };

    /**
     * Loads the available configurations into the dialog and opens it.
     * Used by SETTINGS button in the app.
     * @private
     */
    Component.prototype._reloadConfigurations = function () {
        var oResourceModel = this.getModel("i18n");
        var oConfigDialogModel = this.getModel("ConfigDialogModel");

        Utils.ajax("/sap/hc/mri/pa/services/analytics.xsjs?action=getMyConfigList")
            .done(jQuery.proxy(function (aData) {
                aData.forEach(function (mDatum) {
                    mDatum.selected = mDatum.meta.configId === oConfigDialogModel.getProperty("/currentConfigId");
                });
                this.oConfigSelectionDialog.setModel(new JSONModel({
                    configs: aData,
                    default: false
                }));
                this.oConfigSelectionDialog.setModel(oResourceModel, "i18n");
                this.oConfigSelectionDialog.open();
            }, this))
            .fail(jQuery.proxy(function () {
                Utils.notifyUser("Error", "MRI_PA_CONFIG_ADMIN_VALIDITY_ERROR", null);
            }, this));
    };

    /**
     * Loads the application with a given configuration.
     * Is used as callback to pause initialization of the application during the configuration check and optional
     * configuration selection.
     * @private
     * @param {Object} mConfig Mri config object
     */
    Component.prototype._loadApplication = function (mConfig) {
        MriFrontendConfig.createFrontendConfig(mConfig);
        // only reload if the change was requested via configuration dialog
        if (typeof this._oViews._oViews["sap.hc.mri.pa.ui.views.PatientAnalytics"] !== "undefined") {
            var oNewConfig = MriFrontendConfig.getFrontendConfig();
            this._oViews._oViews["sap.hc.mri.pa.ui.views.PatientAnalytics"].oController.reloadWithNewConfig(oNewConfig);
        } else {
            this.getRouter().initialize();
        }
    };

    /**
     * Checks if the EULA has been accepted. If not, the EULA dialog is displayed.
     * @returns {jQuery.Deferred} Deferred object being rejected if EULA is declined, and resolved if
     * EULA is accepted [or was already accepted in the past]
     * @private
     */
    Component.prototype._checkEula = function () {
        if (!this._$EulaPromise) {
            var that = this;
            this._$EulaPromise = new jQuery.Deferred(function ($deferred) {
                that._getEulaComponent(function (EulaComponent) {
                    var oEulaComponent = new EulaComponent();
                    oEulaComponent.checkEula({
                        accept: function () {
                            $deferred.resolve();
                        },
                        declined: function () {
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
    Component.prototype._getEulaComponent = function (fCallback) {
        sap.ui.require([
            "sap/hc/hph/eula/ui/components/acceptEula/Component"
        ], fCallback);
    };

    /**
     * Handler for Ok Button pressed in the Config Selection Dialog.
     * Creates a configData object from the selection, gets the configuration from the backend and continues
     * initializing the application.
     * If the Save as Default CheckBox has been selected, sends another request to set the default configuration.
     */
    Component.prototype.onConfigSelected = function () {
        this.oConfigSelectionDialog.setBusyIndicatorDelay(0).setBusy(true);
        var mConfigData = this.oConfigSelectionDialog.getModel().getProperty("/configs").filter(function (mConfig) {
            return mConfig.selected;
        }).map(function (mConfig) {
            return {
                action: "getFrontendConfig",
                configId: mConfig.meta.configId,
                configVersion: mConfig.meta.configVersion
            };
        })[0];
        Utils.ajax({
            url: "/sap/hc/mri/pa/services/analytics.xsjs",
            type: "POST",
            data: JSON.stringify(mConfigData),
            contentType: "application/json;charset=utf-8",
            dataType: "json"
        }).done(jQuery.proxy(function (mData) {
            // Save current config id
            var oConfigDialogModel = this.getModel("ConfigDialogModel");
            oConfigDialogModel.setProperty("/currentConfigId", mData.meta.configId, true);
            this._loadApplication(mData);
            // dialog has to be closed  after application was loaded
            this.oConfigSelectionDialog.close();
            this.oConfigSelectionDialog.setBusy(false);
        }, this));
        if (this.oConfigSelectionDialog.getModel().getProperty("/default")) {
            mConfigData.action = "setDefault";
            Utils.ajax({
                url: "/sap/hc/mri/pa/services/analytics.xsjs",
                type: "POST",
                data: JSON.stringify(mConfigData),
                contentType: "application/json;charset=utf-8"
            });
        }
    };

    /**
     * Handler for the Config Selection Dialog Cancel Button press.
     * @param {sap.ui.base.Event} oEvent Button Press Event
     */
    Component.prototype.onClosePressed = function (oEvent) {
        oEvent.getSource().getParent().getParent().close();
    };

    /**
     * Handler for the Config Selection Dialog close.
     * Is called if the Config Selection Dialog is closed without selecting a config.
     * Navigates to the launchpad if no config has been selected.
     */
    Component.prototype.onDialogClose = function () {
        if (typeof MriFrontendConfig.getFrontendConfig() !== "object") {
            this._navigateToFlp();
        }
    };

    Component.prototype._fnAddHelpLink = function () {
        var oCorei18nResourceModel = new ResourceModel({
            bundleUrl: [jQuery.sap.getModulePath("sap.hc.hph.core.ui"), "i18n/messagebundle.properties"].join("/")
        });
        if (sap.ushell && sap.ushell.renderers) {
            var oRenderer = sap.ushell.renderers.fiori2.RendererExtensions;
            this._oHelpLink = new sap.m.Button({
                icon: "sap-icon://sys-help",
                text: oCorei18nResourceModel.getResourceBundle().getText("APPLICATION_HELP"),
                press: [function () {
                    var sUrl = "https://uacp2.hana.ondemand.com/viewer/40f0b71017734398949a57f0ba0ee839/2.0.4/en-US/3b70695dc8e24efd94d987167978bd7d.html";
                    if (navigator.language === "en-US" || navigator.language === "en-GB" || navigator.language === "en") {
                        sUrl = "https://uacp2.hana.ondemand.com/viewer/40f0b71017734398949a57f0ba0ee839/2.0.4/en-US/3b70695dc8e24efd94d987167978bd7d.html";
                    } else if (navigator.language === "de-DE" || navigator.language === "de") {
                        sUrl = "https://uacp2.hana.ondemand.com/viewer/40f0b71017734398949a57f0ba0ee839/2.0.4/de-DE/3b70695dc8e24efd94d987167978bd7d.html";
                    } else if (navigator.language === "fr-FR" || navigator.language === "fr") {
                        sUrl = "https://uacp2.hana.ondemand.com/viewer/40f0b71017734398949a57f0ba0ee839/2.0.4/fr-FR/3b70695dc8e24efd94d987167978bd7d.html";
                    }
                    window.open(sUrl, "_blank");

                }, this]
            });
            oRenderer.addOptionsActionSheetButton(this._oHelpLink, oRenderer.LaunchpadState.App);
        }
    };

    Component.prototype._navigateToFlp = function () {
        // Running in shell should navigate back to Launchpad entry
        if (sap.ushell) {
            sap.ushell.Container.getService("CrossApplicationNavigation").toExternal({
                target: {
                    shellHash: ""
                }
            });
        }
    };

    return Component;
});
