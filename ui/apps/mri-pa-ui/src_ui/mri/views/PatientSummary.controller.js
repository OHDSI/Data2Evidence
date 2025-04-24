sap.ui.define([
    "jquery.sap.global",
    "hc/mri/pa/ui/Utils",
    "sap/ui/model/resource/ResourceModel"
], function (jQuery, Utils, ResourceModel) {
    "use strict";

    sap.ui.controller("hc.mri.pa.ui.views.PatientSummary", {
        onInit: function () {
            var oResourceModel = new ResourceModel({
                bundleUrl: jQuery.sap.getModulePath("hc.mri.pa.ui") + "/i18n/text.properties"              
            });
           
            this.getView().setModel(oResourceModel, "i18n");

            this.mEventHandler = {
                beforeDataLoad: this._onBeforeDataLoad,
                afterDataLoad: this._onAfterDataLoad
            };
        },
        getDialog: function() {
            return this.byId("contentDialog");
        },
        attachComponentEvents: function () {
            var oPSComponent = this._getContentComponent();
            Object.keys(this.mEventHandler).forEach(function (sEventName) {
                oPSComponent.attachEvent(sEventName, this.mEventHandler[sEventName], this);
            }, this);
        },
        detachComponentEvents: function () {
            var oPSComponent = this._getContentComponent();
            if (oPSComponent) {
                Object.keys(this.mEventHandler).forEach(function (sEventName) {
                    oPSComponent.detachEvent(sEventName, this.mEventHandler[sEventName], this);
                }, this);
            }
        },
        /**
         * Handler for Reset-Settings Button press.
         * Call resetSettings of the Patient Summary component to reset all timeline customizations.
         * FUTURE: Use the sap.ushell.ui.footerbar.AddBookmarkButton with version 1.30.x
         * @param {sap.ui.base.Event} oEvent Button press event
         */
        onResetSettingsPressed: function () {
            var oPSComponent = this._getContentComponent();
            oPSComponent.resetSettings();
        },
        /**
         * On Closed Handler for the Timeline Dialog
         * @param {sap.ui.base.Event} oEvent Button Press Event
         */
        onClosePressed: function () {
            var dialog = this.getDialog();
            this.detachComponentEvents();
            // if(this._getContentComponent()) {
            //     this._getContentComponent().destroy();
            // }         
            dialog.destroy();
        },
        open: function () {     
            this.byId("contentContainer")
            .setComponent(
                sap.ui.component({
                    name: "hc.hph.patient.app.ui.content",
                    settings: this.getView().getModel("patientSummary").getData().settings
                }));
            var dialog = this.getDialog();
            dialog.addStyleClass(Utils.getContentDensityClass());
            dialog.open();
            this.attachComponentEvents();
        },
        _onBeforeDataLoad: function () {
            this.getView().getModel("patientSummary").setProperty("/dataLoaded", false);
        },
        _onAfterDataLoad: function () {
            this.getView().getModel("patientSummary").setProperty("/dataLoaded", true);
        },
        /**
         * Get the internal content component of the Patient Summary.
         * @private
         * @returns {sap.hc.hph.patient.app.ui.ui.content.Component} Content component.
         */
        _getContentComponent: function () {
            return this.byId("contentContainer").getComponentInstance();
        },
        /**
         * Handler for Save-as-Tile Button press.
         * Call the Fiori BookmarkService to add a link to the current Patient Timeline to the users homepage.
         * FUTURE: Use the sap.ushell.ui.footerbar.AddBookmarkButton with version 1.30.x
         * @param {sap.ui.base.Event} oEvent Button press event
         */
        onAddTilePressed: function () {
            var sPatientId = this._getContentComponent().getPatientId();
            var sTileTitle = this._getContentComponent().getTitle();
            if (!sTileTitle) {
                jQuery.sap.log.error("Patient Summary Header is empty. Using PatientId for Tile title instead");
                sTileTitle = sPatientId;
            }
            sap.ushell.Container.getService("Bookmark").addBookmark({
                title: sTileTitle,
                subtitle: Utils.getText("MRI_PA_PATIENT_INSPECTOR_TITLE"),
                icon: "sap-icon://wounds-doc",
                url: "#PatientComponent-show&/patient/" + sPatientId
            }).done(function () {
                Utils.notifyUser(sap.ui.core.MessageType.Success, "MRI_PA_ADDING_PS_TILE_SUCCESS");
            }).fail(function (sErrorMessage) {
                Utils.notifyUser(sap.ui.core.MessageType.Error, sErrorMessage);
            });
        },
        onSelectConfigurationPressed: function (){
            this._getContentComponent().openConfigSelectionDialog();
        }
    });
});
