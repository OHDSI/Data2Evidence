jQuery.sap.registerModulePath("hc", "/hc");

// Load the Core library explicitly as we depend on it being loaded before initializing the Component.
sap.ui.getCore().loadLibrary("hc.hph.core.ui");

sap.ui.define([
    "jquery.sap.global",
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "sap/ui/core/UIComponent",
    "sap/ui/core/IconPool",
    "sap/ui/model/resource/ResourceModel"
], function (jQuery, ConfigUtils, UIComponent, IconPool, ResourceModel) {
    "use strict";

    var Component = UIComponent.extend("hc.hph.cdw.config.ui.Component", {
        metadata: {
            name: "Clinical Data Model Configuration",
            version: "${version}",
            dependencies: {
                libs: [
                    "hc.hph.cdw.config.ui.lib",
                    "hc.hph.core.ui",
                    "sap.m",
                    "sap.ui.commons",
                    "sap.ui.core",
                    "sap.ui.layout",
                    "sap.ui.unified",
                    "sap.ui.ux3",
                    "sap.ui.table",
                ],
                ui5version: "1.28.3"
            },
            config: {
                fullWidth: true,
                titleResource: "HPH_CDM_CFG_APP_TITLE",
                resourceBundle: "../i18n/cdw.properties",
                modulePath: "/hc/hph/cdw/config/ui",
                configService: {
                    modulePath: "/hc/hph/cdw/config",
                    resourceBundle: "i18n/config.properties"
                }
            },
            rootView: "hc.hph.cdw.config.ui.views.App"
        }
    });

    /**
     * Initialize the component.
     * @override
     */
    Component.prototype.init = function () {
        UIComponent.prototype.init.apply(this, arguments);

        // ----
        // Resource bundle model for i18n:
        var sResourceBundlePackage = "hc.hph.cdw.config.ui.i18n";
        var oRBModel = this.getModel(sResourceBundlePackage);

        this._fnAddHelpLink();

        if (!oRBModel) {

            oRBModel = new ResourceModel({
                bundleUrl: this.getMetadata().getConfig().modulePath + "/" + this.getMetadata().getConfig().resourceBundle
            });
            oRBModel.enhance({
                bundleUrl: this.getMetadata().getConfig().configService.modulePath + "/" + this.getMetadata().getConfig().configService.resourceBundle
            });

            this.setModel(oRBModel, sResourceBundlePackage);
            ConfigUtils.setResourceBundle(oRBModel.getResourceBundle());
        }

        // Patient Resource bundle model for i18n:
		var sPatientResourceBundlePackage = "hc.hph.patient.config.i18n";
		var oPatientRBModel = this.getModel(sPatientResourceBundlePackage);

        if (!oPatientRBModel) {

            oPatientRBModel = new ResourceModel({
                bundleUrl: "/hc/hph/patient/config/i18n/text.hdbtextbundle"
            });

            this.setModel(oPatientRBModel, sPatientResourceBundlePackage);
        }

    };

    Component.prototype._fnAddHelpLink = function () {
        var oCorei18nResourceModel = new ResourceModel({
            bundleUrl: [jQuery.sap.getModulePath("hc.hph.core.ui"), "i18n/messagebundle.properties"].join("/")
        });
        if (sap.ushell && sap.ushell.renderers) {
            var oRenderer = sap.ushell.renderers.fiori2.RendererExtensions;
            this._oHelpLink = new sap.m.Button({
                icon: "sap-icon://sys-help",
                text: oCorei18nResourceModel.getResourceBundle().getText("APPLICATION_HELP"),
                press: [function () {
                    var sUrl = "https://help.sap.com/viewer/fddd7c5de941469e9803c5a036d8d6ff/2.0.0/en-US/799ab86a96c84c64bf1d0600276f3136.html";
                    window.open(sUrl, "_blank");

                }, this]
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
});
