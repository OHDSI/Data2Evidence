sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "sap/ui/model/resource/ResourceModel"
], function (jQuery, Utils, ResourceModel) {
    "use strict";

    sap.ui.controller("sap.hc.mri.pa.ui.views.CohortsApp", {
        onInit: function () {
            var oResourceModel = new ResourceModel({
                bundleUrl: jQuery.sap.getModulePath("sap.hc.mri.pa.ui") + "/i18n/text.properties"
            });

            this.getView().setModel(oResourceModel, "i18n");

        },
        getDialog: function () {
            return this.byId("contentDialog");
        },
        /**
         * On Closed Handler for the Timeline Dialog
         * @param {sap.ui.base.Event} oEvent Button Press Event
         */
        onClosePressed: function () {
            var dialog = this.getDialog();
            dialog.destroy();
        },
        open: function () {
            this.byId("contentContainer")
                .setComponent(
                    sap.ui.component({
                    name: "sap.hc.hph.collections.ui.components.collectionsManager"
                    })
                );
            var dialog = this.getDialog();
            dialog.addStyleClass(Utils.getContentDensityClass());
            dialog.open();
        },
      
        /**
         * Get the internal content component of the Patient Summary.
         * @private
         * @returns {sap.hc.hph.patient.app.ui.ui.content.Component} Content component.
         */
        _getContentComponent: function () {
            return this.byId("contentContainer").getComponentInstance();
        },

    });
});
