sap.ui.define([
    "jquery.sap.global",
    "sap/hc/hph/patient/plugins/tabs/lab/ui/lib/Utils",
    "sap/hc/hph/patient/app/ui/content/extension/TabExtensionBase",
    "sap/ui/model/resource/ResourceModel"
], function (jQuery, Utils, TabExtensionBase, ResourceModel) {
    "use strict";

    /**
     * Patient Summary lab Tab Extension.
     * @constructor
     *
     * @extends sap.hc.hph.patient.ui.content.extension.TabExtensionBase
     * @alias sap.hc.hph.patient.plugins.tabs.lab.ui.Extension
     */
    var TabExtension = TabExtensionBase.extend("sap.hc.hph.patient.plugins.tabs.lab.ui.Extension", {
        constructor: function () {
            this.oResourceModel = new ResourceModel({
                bundleUrl: "/sap/hc/hph/patient/plugins/tabs/lab/ui/i18n/text.properties"
            });
            Utils.setResourceBundle(this.oResourceModel.getResourceBundle());
        }
    });

    /**
     * Get the Controls to be added to the new tab.
     * @param {Object} mNavTargets - object containing the current navigation targets for this extension
     * @returns {sap.ui.core.Control[]} Controls to be added to the new tab
     */
    TabExtension.prototype.getContent = function (/* mNavTargets */) {
        var oContentView = sap.ui.xmlview({
            viewName: "sap.hc.hph.patient.plugins.tabs.lab.ui.view.Lab"
        });
        oContentView.setModel(this.oResourceModel, "i18n");
        return oContentView;
    };

    /**
     * Get the (translated) Text for the new tab.
     * @returns {string} Text for the new tab
     */
    TabExtension.prototype.getText = function () {
        return Utils.getText("PS_PLUGINS_TABS_LAB_TAB_TITLE");
    };

    return TabExtension;
});
