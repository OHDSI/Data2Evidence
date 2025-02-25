sap.ui.define([
    "jquery.sap.global",
    "./library",
    "sap/m/ToggleButton"
], function (jQuery, library, ToggleButton) {
    "use strict";

    /**
     * Constructor for a new OverviewButton.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * This control extends the regular ToggleButton to add a class based on the color.
     * @extends sap.m.ToggleButton
     * @alias sap.hc.hph.patient.app.ui.lib.OverviewButton
     */
    var OverviewButton = ToggleButton.extend("hc.hph.patient.app.ui.lib.OverviewButton", {
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

    var sBaseClass = "sapTlOverviewButton";

    /**
     * Function is called before the rendering of the control is started.
     * Set the type of the ToggleButton to Unstyled, so we can apply our own styles easily.
     * @override
     * @protected
     */
    OverviewButton.prototype.onBeforeRendering = function () {
        this.setType(sap.m.ButtonType.Unstyled);
        this.addStyleClass(sBaseClass);
    };

    /**
     * Setter for the property Color.
     * Also adds a class to the control to add color dependent styling.
     * @override
     * @param   {sap.hc.hph.patient.app.ui.lib.LaneColor}      sColor Color to be used for the stlye
     * @returns {sap.hc.hph.patient.app.ui.lib.OverviewButton} Reference to this in order to allow method chaining
     */
    OverviewButton.prototype.setColor = function (sColor) {
        if (this.getColor()) {
            this.removeStyleClass(sBaseClass + this.getColor());
        }
        this.addStyleClass(sBaseClass + sColor);
        this.setProperty("color", sColor, true);
        return this;
    };

    /**
     * Overwrite the ToogleButton setPressed method to add pressed class based on state.
     * @override
     * @returns {sap.hc.hph.patient.app.ui.lib.OverviewButton} Reference to this in order to allow method chaining
     */
    OverviewButton.prototype.setPressed = function () {
        ToggleButton.prototype.setPressed.apply(this, arguments);
        this.$("inner").toggleClass("sapMToggleBtnPressed", this.getPressed());
        return this;
    };

    return OverviewButton;
});
