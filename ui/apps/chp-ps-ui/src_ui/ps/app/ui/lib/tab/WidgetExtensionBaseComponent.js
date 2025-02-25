sap.ui.define([
    "sap/ui/core/Control",
    "sap/ui/core/mvc/View",
    "./TabExtensionBaseComponent",
    "./WidgetBaseController"
], function (Control, View, TabExtensionBaseComponent, WidgetBaseController) {
    "use strict";

    /**
     * Constructor for a Patient Summary Custom Widget Extension.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
	 * WidgetExtensionBaseComponent can be used as base class for widget extensions.
     * If a WidgetBaseController is used as controller of the component's root control, the corresponding data
     * processing functions (e.g. startProcessing, addEntry) are called automatically.
     *
     * Hint:
     * Widget extensions are not required to use a subclass of the WidgetExtensionBaseComponent.
     * They can also use a UIComponent directly with the following interface:
     *
     * Optional:
     *  - one or more of the properties of the WidgetExtensionBaseComponent, they will be two-way bound to the corresponding data
     *  - resetSettings() function which is called when the user resets the settings to defaults
     *
     * @extends sap.hc.hph.patient.app.ui.lib.tab.TabExtensionBaseComponent
     * @alias sap.hc.hph.patient.app.ui.lib.tab.WidgetExtensionBaseComponent
     */
    var WidgetExtensionBaseComponent = TabExtensionBaseComponent.extend("hc.hph.patient.app.ui.lib.tab.WidgetExtensionBaseComponent");

    WidgetExtensionBaseComponent.prototype.getController = function () {
        if (this.mAggregations.rootControl instanceof View) {
            var oWidgetController = this.mAggregations.rootControl.getController();
            if (oWidgetController instanceof WidgetBaseController) {
                return oWidgetController;
            }
        }
    };

    return WidgetExtensionBaseComponent;
});
