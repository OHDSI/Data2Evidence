sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "hc/mri/pa/config/ui/lib/Formatter"
], function (Controller, Formatter) {
    "use strict";

    /**
     * Constructor for the PatientListTab Controller.
     * @constructor
     *
     * @classdesc
     * Controller for the patient list tab.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.mri.pa.config.ui.views.PatientListTab
     */
    var PatientListTabController = Controller.extend("hc.mri.pa.config.ui.views.PatientListTab");

    PatientListTabController.prototype.formatter = Formatter;

    /**
     * Handler for the press event on the whole Toolbar inside the Panel header.
     * We listen to this event to make the panel expand when any part of the
     * toolbar is pressed, not only the expand arrow to the left.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    PatientListTabController.prototype.onHeaderToolbarPress = function (oEvent) {
        if (
            oEvent
                .getParameter("srcControl")
                .getMetadata()
                .getName() !== "sap.m.Switch"
        ) {
            var oPanel = oEvent.getSource().getParent();
            oPanel.setExpanded(!oPanel.getExpanded());
        }
    };

    PatientListTabController.prototype.onVisibleChanged = function (oEvent) {
        var newState = oEvent.getParameters().state;
        var attributePath = oEvent.getSource().getParent().getBindingContext("analyticsModel").getPath();

        if (!newState) {
            this.getView().getModel("analyticsModel").setProperty(attributePath + "/patientlist/initial", newState);
        }
    };

    /**
     * Handler for the change event on the switch to make all attributes visible/invisible.
     * @param {sap.ui.base.Event} oEvent SAPUI5 change Event.
     */
    PatientListTabController.prototype.onAllInitialPressed = function (oEvent) {
        var newState = oEvent.getParameters().selected;
        var parentTable = oEvent.getSource().getParent().getParent().getParent();
        var nbOfAttributes = parentTable.getBindingContext("analyticsModel").getProperty("attributes").length;
        var filtercardPath = parentTable.getBindingContext("analyticsModel").getPath();

        for (var i = 0; i < nbOfAttributes; i++) {
            var isVisible = this.getView().getModel("analyticsModel").getProperty(filtercardPath + "/attributes/" + i + "/patientlist/visible");
            if (!(!isVisible && newState)) {
                this.getView().getModel("analyticsModel").setProperty(filtercardPath + "/attributes/" + i + "/patientlist/initial", newState);
            }
        }
    };

    /**
     * Handler for the change event on the switch to make all attributes initial.
     * @param {sap.ui.base.Event} oEvent SAPUI5 change Event.
     */
    PatientListTabController.prototype.onAllVisiblePressed = function (oEvent) {
        var newState = oEvent.getParameters().state;
        var parentTable = oEvent.getSource().getParent().getParent().getParent();
        var nbOfAttributes = parentTable.getBindingContext("analyticsModel").getProperty("attributes").length;
        var filtercardPath = parentTable.getBindingContext("analyticsModel").getPath();

        for (var i = 0; i < nbOfAttributes; i++) {
            this.getView().getModel("analyticsModel").setProperty(filtercardPath + "/attributes/" + i + "/patientlist/visible", newState);

            if (!newState) {
                this.getView().getModel("analyticsModel").setProperty(filtercardPath + "/attributes/" + i + "/patientlist/initial", newState);
            }
        }
    };

    PatientListTabController.prototype.onAllLinkPressed = function (oEvent) {
        var newState = oEvent.getParameters().selected;
        var parentTable = oEvent.getSource().getParent().getParent().getParent();
        var nbOfAttributes = parentTable.getBindingContext("analyticsModel").getProperty("attributes").length;
        var filtercardPath = parentTable.getBindingContext("analyticsModel").getPath();

        for (var i = 0; i < nbOfAttributes; i++) {
            this.getView().getModel("analyticsModel").setProperty(filtercardPath + "/attributes/" + i + "/patientlist/linkColumn", newState);
        }
    };

    return PatientListTabController;
});
