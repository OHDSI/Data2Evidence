sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/mvc/Controller"
], function (jQuery, Controller) {
    "use strict";

    /**
     * Constructor for the MasterdataTab Controller.
     * @constructor
     *
     * @classdesc
     * Controller for the masterdata tab.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.hph.patient.config.ui.views.MasterdataTab
     */
    var MasterdataTabController = Controller.extend("hc.hph.patient.config.ui.views.MasterdataTab");

    /**
     * Handler for Add-Details-Row Button press.
     * Add an entry to the masterdata details array.
     */
    MasterdataTabController.prototype.onAddDetailsRow = function () {
        var sDetailsPath = this.getView().getBindingContext("analyticsModel").getPath() + "/config/masterdata/details";
        var aDetails = this.getView().getModel("analyticsModel").getProperty(sDetailsPath);
        aDetails.push({
            pattern: "",
            values: []
        });
        this.getView().getModel("analyticsModel").setProperty(sDetailsPath, aDetails);
    };

    /**
     * Handler for Remove-Details-Row Button press.
     * Remove the entry from the masterdata details array.
     * @param {sap.ui.base.Event} oEvent Button press event
     */
    MasterdataTabController.prototype.onRemoveDetailsRow = function (oEvent) {
        var sRowPath = oEvent.getSource().getParent().getBindingContext("analyticsModel").getPath();
        var aPathParts = /(.+)\/(\d+)/.exec(sRowPath);
        var sDetailsPath = aPathParts[1];
        var sRowNb = parseInt(aPathParts[2], 10);
        var aDetails = this.getView().getModel("analyticsModel").getProperty(sDetailsPath);
        aDetails.splice(sRowNb, 1);
        this.getView().getModel("analyticsModel").setProperty(sDetailsPath, aDetails);
    };

    /**
     * Handler for opening the selection menu for creating pattern for the title and details
     * @param {sap.ui.base.Event} oEvent Button press event
     */
    MasterdataTabController.prototype.handlePressOpenMenu = function (oEvent) {
        var oButton = oEvent.getSource();
        var eDock = sap.ui.core.Popup.Dock;
        var that = this;

        this._openerButton = oButton;

        if (!this._modelMenu) {
            this._modelMenu = this.byId("modelMenu");
            this._modelMenu.attachItemSelect(function (oItemSelectEvent) {
                var selectedKey = oItemSelectEvent.getParameters().item.getCustomData()[0].getValue();
                var sRowPath = that._openerButton.getParent().getBindingContext("analyticsModel").getPath();
                var analyticsModel = that.getView().getModel("analyticsModel");
                var aRow = analyticsModel.getProperty(sRowPath);

                /*
                Values is no longer needed as the code is inserted directly into the pattern
                if Values has a value, it means the config is an old config.
                */
                if (aRow.values && aRow.values.length > 0) {
                    aRow.pattern = "";
                }

                analyticsModel.setProperty(sRowPath, {
                    pattern: aRow.pattern += " {" + selectedKey + "}",
                    values: []
                });
            });
        }

        this._modelMenu.open(this._bKeyboard, oButton, eDock.BeginTop, eDock.BeginBottom, oButton);
    };

    return MasterdataTabController;
});
