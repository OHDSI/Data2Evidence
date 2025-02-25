sap.ui.define([
    "jquery.sap.global",
    "sap/hc/hph/patient/app/ui/lib/library",
    "sap/m/ObjectAttribute"
], function (jQuery, library, ObjectAttribute) {
    "use strict";

    /**
     * Constructor for a new ColoredObjectAttribute.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * This control extends the regular ColoredObjectAttribute to add a class based on the color.
     * @extends sap.m.ObjectAttribute
     * @alias sap.hc.hph.patient.plugins.widgets.risks.ui.lib.ColoredObjectAttribute
     */
    var ColoredObjectAttribute = ObjectAttribute.extend("sap.hc.hph.patient.plugins.widgets.risks.ui.lib.ColoredObjectAttribute", {
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

    var sBaseClass = "sapPSRiskClass";

    /**
     * Setter for the property Color.
     * Also adds a class to the control to add color dependent styling.
     * @override
     * @param   {sap.hc.hph.patient.app.ui.lib.LaneColor}      sColor Color to be used for the stlye
     * @returns {sap.hc.hph.patient.app.ui.lib.ColoredObjectAttribute} Reference to this in order to allow method chaining
     */
    ColoredObjectAttribute.prototype.setColor = function (sColor) {
        if (this.getColor()) {
            this.removeStyleClass(sBaseClass + this.getColor());
        }
        if (sColor) {
            this.addStyleClass(sBaseClass + sColor);
        }
        this.setProperty("color", sColor, true);
        return this;
    };

    return ColoredObjectAttribute;
});
