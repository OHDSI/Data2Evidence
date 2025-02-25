sap.ui.define(
  ["jquery.sap.global", "sap/ui/core/mvc/Controller", "hc/hph/patient/shared/ZoomOptions"],
  function (jQuery, Controller, ZoomOptions) {
    "use strict";

    /**
     * Constructor for the InspectorTabsTab Controller.
     * @constructor
     *
     * @classdesc
     * Controller for the inspector tabs tab.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.hph.patient.config.ui.views.InspectorTabsTab
     */
    var InspectorTabsTabController = Controller.extend("hc.hph.patient.config.ui.views.InspectorTabsTab");

    /**
     * Initialize the Controller.
     * @override
     */
    InspectorTabsTabController.prototype.onInit = function () {
      var zoomModel = new sap.ui.model.json.JSONModel();
      zoomModel.setData({
        timeBasedZoomOptions: ZoomOptions.timeBasedZoomOptions,
        dataBasedZoomOptions: ZoomOptions.dataBasedZoomOptions,
      });
      this.getView().setModel(zoomModel, "zoomModel");
    };

    /**
     * formatter for translating the zoom options in the select lists
     * @param   {string} sName  - name of the zoom option (i18n Key for translation)
     * @returns {string}        - translated name of the zoom option
     */
    InspectorTabsTabController.prototype.formatZoomText = function (sName) {
      var result = ZoomOptions.formatZoomText(sName);
      return result;
    };

    /**
     * formatter for translating the explanation text for the databased zoom options
     * @param   {string} sKey  - key of the currently selected databased zoom option
     * @returns {string}        - translated name of the zoom option
     */
    InspectorTabsTabController.prototype.formatDatabasedTooltip = function (sKey) {
      var result = ZoomOptions.formatDatabasedTooltip(sKey);
      return result;
    };

    /**
     * array of objects containing key and name of zoom options
     */
    InspectorTabsTabController.prototype.dataBasedZoomOptions = ZoomOptions.dataBasedZoomOptions;

    /**
     * array of objects containing key and name of zoom options
     */
    InspectorTabsTabController.prototype.timeBasedZoomOptions = ZoomOptions.timeBasedZoomOptions;

    /**
     * function to set the pressed state of the other initial zoom buttons to false if one is clicked
     * @param   {object} oEvent   - sapui5 button press event
     */
    InspectorTabsTabController.prototype.setInitialZoom = function (oEvent) {
      var sKey = oEvent.getSource().data("key");
      var oContext = oEvent.getSource().getBindingContext("analyticsModel");
      var sInitialZoom = oContext.getProperty("config/inspectorOptions/timeline/zoom/initialZoom");
      if (sKey !== sInitialZoom) {
        oContext.getModel().setProperty("config/inspectorOptions/timeline/zoom/initialZoom", sKey, oContext);
      }
    };

    return InspectorTabsTabController;
  }
);
