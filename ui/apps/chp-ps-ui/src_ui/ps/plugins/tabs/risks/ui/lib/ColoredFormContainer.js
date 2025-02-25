sap.ui.define([
    "jquery.sap.global",
    "sap/hc/hph/patient/app/ui/lib/library",
    "sap/ui/layout/form/FormContainer"
], function (jQuery, library, FormContainer) {
    "use strict";

    /**
     * Constructor for a new ColoredFormContainer.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * This control extends the regular FormContainer to add a class based on the color.
     * @extends sap.m.FormContainer
     * @alias sap.hc.hph.patient.app.ui.lib.ColoredFormContainer
     */
    var ColoredFormContainer = FormContainer.extend("sap.hc.hph.patient.plugins.tabs.risks.ui.lib.ColoredFormContainer", {
        metadata: {
            library: "sap.hc.hph.patient.app.ui.lib",
            properties: {
                /**
                 * Color to be used for the stlying.
                 * Has to be one of the defined colors in order for CSS to work.
                 */
                color: {
                    type: "sap.hc.hph.patient.app.ui.lib.LaneColor",
                    group: "Appearance"
                }
            }
        }
    });

    return ColoredFormContainer;
});
