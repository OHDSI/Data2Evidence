sap.ui.define([
    "jquery.sap.global",
    "hc/hph/patient/plugins/tabs/documents/ui/lib/Utils",
    "hc/hph/patient/app/ui/content/extension/TabExtensionBase",
    "sap/ui/model/resource/ResourceModel"
], function (jQuery, Utils, TabExtensionBase, ResourceModel) {
    "use strict";

    /**
     * Patient Summary Documents Tab Extension.
     * @constructor
     *
     * @extends hc.hph.patient.ui.content.extension.TabExtensionBase
     * @alias hc.hph.patient.plugins.tabs.documents.ui.Extension
     */
    var TabExtension = TabExtensionBase.extend("hc.hph.patient.plugins.tabs.documents.ui.Extension", {
        constructor: function () {
            this.oResourceModel = new ResourceModel({
                bundleUrl: "/hc/hph/patient/plugins/tabs/documents/ui/i18n/text.properties"
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
            viewName: "hc.hph.patient.plugins.tabs.documents.ui.view.Documents"
        });
        oContentView.setModel(this.oResourceModel, "i18n");
        return oContentView;
    };

    /**
     * Get the (translated) Text for the new tab.
     * @returns {string} Text for the new tab
     */
    TabExtension.prototype.getText = function () {
        return Utils.getText("PS_PLUGINS_TABS_DOC_TAB_TITLE");
    };

    return TabExtension;
});
