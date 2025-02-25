sap.ui.define([
    "jquery.sap.global",
    "sap/hc/hph/patient/plugins/tabs/risks/ui/lib/Utils",
    "sap/hc/hph/patient/app/ui/content/extension/TabExtensionBase",
    "sap/ui/model/resource/ResourceModel"
], function (jQuery, Utils, TabExtensionBase, ResourceModel) {
    "use strict";

    /**
     * Patient Summary Risks Tab Extension.
     * @constructor
     *
     * @extends sap.hc.hph.patient.ui.content.extension.TabExtensionBase
     * @alias sap.hc.hph.patient.plugins.tabs.risks.ui.Extension
     */
    var TabExtension = TabExtensionBase.extend("sap.hc.hph.patient.plugins.tabs.risks.ui.Extension", {
        constructor: function () {
            this.oResourceModel = new ResourceModel({
                bundleUrl: "/sap/hc/hph/patient/plugins/tabs/risks/ui/i18n/text.properties"
            });
            Utils.setResourceBundle(this.oResourceModel.getResourceBundle());
        }
    });

    /**
     * Get the Controls to be added to the new tab.
     * @returns {sap.ui.core.Control[]} Controls to be added to the new tab
     */
    TabExtension.prototype.getContent = function () {
        var oContentView = sap.ui.xmlview({
            viewName: "sap.hc.hph.patient.plugins.tabs.risks.ui.view.Risks"
        });
        oContentView.setModel(this.oResourceModel, "i18n");
        return oContentView;
    };

    /**
     * Get the (translated) Text for the new tab.
     * @returns {string} Text for the new tab
     */
    TabExtension.prototype.getText = function () {
        return Utils.getText("PS_PLUGINS_TABS_RISK_TAB_TITLE");
    };

    return TabExtension;
});
