sap.ui.define([
    "jquery.sap.global",
    "sap/hc/hph/patient/app/ui/content/extension/TabExtensionBase",
    "sap/hc/hph/patient/plugins/tabs/timeline/ui/lib/Utils",
    "sap/ui/model/resource/ResourceModel"
], function (jQuery, TabExtensionBase, Utils, ResourceModel) {
    "use strict";

    /**
     * Patient Summary Timeline Tab Extension.
     * @constructor
     *
     * @extends sap.hc.hph.patient.ui.content.extension.TabExtensionBase
     * @alias sap.hc.hph.patient.plugins.tabs.timeline.ui.Extension
     */
    var TabExtension = TabExtensionBase.extend("hc.hph.patient.plugins.tabs.timeline.ui.Extension", {
        constructor: function () {
            this.oResourceModel = new ResourceModel({
                bundleUrl: "/sap/hc/hph/patient/plugins/tabs/timeline/ui/i18n/text.properties"
            });
            Utils.setResourceBundle(this.oResourceModel.getResourceBundle());
        }
    });

    /**
     * Get the Controls to be added to the new tab.
     * @returns {sap.ui.core.Control[]} Controls to be added to the new tab
     */
    TabExtension.prototype.getContent = function (/* mNavTargets */) {
        var oContentView = sap.ui.xmlview({
            viewName: "hc.hph.patient.plugins.tabs.timeline.ui.view.Timeline"
        });
        oContentView.setModel(this.oResourceModel, "i18n");
        return oContentView;
    };

    /**
     * Get the (translated) Text for the new tab.
     * @returns {string} Text for the new tab
     */
    TabExtension.prototype.getText = function () {
        return Utils.getText("PS_PLUGINS_TABS_DIAG_TAB_TITLE");
    };

    return TabExtension;
});
