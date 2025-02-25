sap.ui.define([
    "hc/hph/patient/app/ui/lib/tab/TabBaseController"
], function (TabBaseController) {
    "use strict";

    /**
     * Constructor for the WidgetBaseController.
     * @constructor
     *
     * @classdesc
     * This Controller can be used as base class for the controller of a widget extension's root control.
     * It is responsible for patient data processing and has handlers for all actions of the tabs of the Patient Summary.
     *
     * @extends sap.hc.hph.patient.app.ui.lib.tab.TabBaseController
     * @alias sap.hc.hph.patient.app.ui.lib.tab.WidgetBaseController
     */
    var WidgetBaseController = TabBaseController.extend("hc.hph.patient.app.ui.lib.tab.WidgetBaseController");

    return WidgetBaseController;
});
