jQuery.sap.registerModulePath("sap.hc", "/sap/hc");
sap.ui.define([
    "jquery.sap.global",
    "./Utils",
    "sap/m/Button",
    "sap/ui/core/UIComponent",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/resource/ResourceModel"
], function (jQuery, Utils, Button, UIComponent, History, JSONModel, ResourceModel) {
    "use strict";
    /**
     * Constructor for the Patient Summary app Component.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * This Component is the starting point of the Patient Summary application.
     * It wraps the Patient Summary content into an app and adds routing and navigation.
     * @extends sap.ui.core.UIComponent
     * @alias sap.hc.hph.patient.app.ui.Component
     */
    var Component = UIComponent.extend("hc.hph.patient.app.ui.Component", {
        metadata: {
            name: "Patient Summary - App",
            version: "${version}",
            includes: [],
            dependencies: {
                libs: [
                    "sap.m",
                    "sap.ui.core"
                ],
                components: [
                    "hc.hph.patient.app.ui.content"
                ],
                ui5version: "1.52.17"
            },
            config: {
                titleResource: "HPH_PAT_APP_TITLE",
                resourceBundle: "i18n/messagebundle.properties"
            },
            rootView: "hc.hph.patient.app.ui.view.App",
            routing: {
                config: {
                    routerClass: sap.m.routing.Router,
                    viewType: "XML",
                    viewPath: "hc.hph.patient.app.ui.view",
                    controlId: "appControl",
                    controlAggregation: "pages",
                    bypassed: {target: "noId"}
                },
                routes: {
                    main: {
                        pattern: "patient/{patientId}/:tab:/:?query:",
                        target: "main"
                    },
                    wrongId: {
                        pattern: "notfound/:patientId:",
                        target: "wrongId"
                    }
                },
                targets: {
                    main: {viewName: "Main"},
                    noId: {viewName: "IdNotFound"},
                    wrongId: {viewName: "PatientNotFound"}
                }
            }
        }
    });
    /**
     * Initializes the Component instance after creation.
     * Create the resource and data model and start the routing.
     * @override
     * @protected
     */
    Component.prototype.init = function () {
        sap.ui.core.UIComponent.prototype.init.apply(this, arguments);
        var mConfig = this.getMetadata().getConfig();
        var oResourceModel = new ResourceModel({
            bundleUrl: [
                jQuery.sap.getModulePath("sap.hc.hph.patient.app.ui"),
                mConfig.resourceBundle
            ].join("/")
        });
        this.setModel(oResourceModel, "i18n");
        Utils.setResourceBundle(oResourceModel.getResourceBundle());
        this.oActionButtons = [];
        this.getRouter().initialize();
        this.addHelpButton();
    };
    /**
     * Add a button to the Launchpad ActionSheet
     * @param {sap.m.Button} oActionButton Button for the Launchpad ActionSheet
     */
    Component.prototype.addActionButton = function (oActionButton) {
        this.oActionButtons.push(oActionButton);
        if (sap.ushell) {
            var oRendererExtensions = sap.ushell.renderers.fiori2.RendererExtensions;
            var mLaunchpadStates = oRendererExtensions.LaunchpadState;
            oRendererExtensions.addOptionsActionSheetButton(oActionButton, mLaunchpadStates.App);
        }
    };
    /**
     * Destruction of the UIComponent.
     * @override
     */
    Component.prototype.destroy = function () {
        sap.ui.core.UIComponent.prototype.destroy.apply(this, arguments);
        if (sap.ushell) {
            var oRendererExtensions = sap.ushell.renderers.fiori2.RendererExtensions;
            var mLaunchpadStates = oRendererExtensions.LaunchpadState;
            this.oActionButtons.forEach(function (oActionButton) {
                oRendererExtensions.removeOptionsActionSheetButton(oActionButton, mLaunchpadStates.App);
            });
        }
    };
    /**
     * Adds a "Help" button to the actions in the options
     */
    Component.prototype.addHelpButton = function () {
        var sCoreI18nBundleURL = [
            jQuery.sap.getModulePath("sap.hc.hph.core.ui"),
            "i18n/messagebundle.properties"
        ].join("/");
        var oCorei18nResourceModel = new ResourceModel({bundleUrl: sCoreI18nBundleURL});
        var oHelpButton = new Button({
            icon: "sap-icon://sys-help",
            text: oCorei18nResourceModel.getResourceBundle().getText("APPLICATION_HELP"),
            press: this.onHelpPressed
        });
        this.addActionButton(oHelpButton);
    };
    /**
     * Handles the press event on the help button
     * Opens the Patient Summary Documentation in the users browser language
     */
    Component.prototype.onHelpPressed = function () {
        var sLang = sap.ui.getCore().getConfiguration().getLocale().getLanguage();
        var sMarcoLang = sLang.substring(0, 2).toLowerCase();
        var sUrl;
        switch (sMarcoLang) {
            case "de":
                sUrl = "https://help.sap.com/viewer/8f82e16cbfa74a3ab3af8cf6bba10694/2.0.0/de-DE/33e1070e2bd44f8bb1b4b91d05072eea.html";
                break;
            case "fr":
                sUrl = "https://help.sap.com/viewer/8f82e16cbfa74a3ab3af8cf6bba10694/2.0.0/fr-FR/33e1070e2bd44f8bb1b4b91d05072eea.html";
                break;
            case "zh":
                sUrl = "https://help.sap.com/viewer/8f82e16cbfa74a3ab3af8cf6bba10694/2.0.0/zh-CN/33e1070e2bd44f8bb1b4b91d05072eea.html";
                break;
            case "es":
                sUrl = "https://help.sap.com/viewer/8f82e16cbfa74a3ab3af8cf6bba10694/2.0.0/es-ES/33e1070e2bd44f8bb1b4b91d05072eea.html";
                break;
            case "pt":
                sUrl = "https://help.sap.com/viewer/8f82e16cbfa74a3ab3af8cf6bba10694/2.0.0/pt-BR/33e1070e2bd44f8bb1b4b91d05072eea.html";
                break;
            case "en":
            default:
                sUrl = "https://help.sap.com/viewer/8f82e16cbfa74a3ab3af8cf6bba10694/2.0.0/en-US/33e1070e2bd44f8bb1b4b91d05072eea.html";
        }
        window.open(sUrl, "_blank");
    };
    /**
     * Navigate back to the previous page.
     * If there is no entry in the history, navigate back to the Launchpad.
     * Otherwise let Fiori navigate to the previous app, i.e. do a browser back.
     * @listens sap.hc.hph.patient.app.ui#afterDataLoad
     * @private
     */
    Component.prototype.navigateBack = function () {
        if (typeof History.getInstance().getPreviousHash() === "undefined") {
            sap.ushell.Container.getService("CrossApplicationNavigation").toExternal({target: {shellHash: ""}});
        } else {
            sap.ushell.Container.getService("CrossApplicationNavigation").backToPreviousApp();
        }
    };
    return Component;
});
