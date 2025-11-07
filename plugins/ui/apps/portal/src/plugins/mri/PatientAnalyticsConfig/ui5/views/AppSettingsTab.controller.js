sap.ui.define([
    "hc/mri/pa/config/ui/lib/Formatter",
    "sap/ui/core/mvc/Controller"
], function (Formatter, Controller) {
    "use strict";

    /**
     * Constructor for the AppSettingsTab Controller.
     * @constructor
     *
     * @classdesc
     * Controller for the app settings tab.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.mri.pa.config.ui.views.AppSettingsTab
     */
    var AppSettingsTabController = Controller.extend("hc.mri.pa.config.ui.views.AppSettingsTab");

    AppSettingsTabController.prototype.formatter = Formatter;

    AppSettingsTabController.prototype._updateDataAccessibleToggle = function() {
      var oAnalyticsModel = this.getView().getModel("analyticsModel");
      var path = this.getView().getBindingContext("analyticsModel").getPath();
      var config = oAnalyticsModel.getProperty(path + "/config/panelOptions/externalAccessPoints");
      oAnalyticsModel.setProperty(path + "/config/panelOptions/calcViewAccessPoint", config);
    }

    return AppSettingsTabController;
});
