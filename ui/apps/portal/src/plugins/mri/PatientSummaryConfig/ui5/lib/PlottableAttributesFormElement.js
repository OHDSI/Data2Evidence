sap.ui.define([
    "jquery.sap.global",
    "./library",
    "sap/ui/layout/form/FormElement",
    "sap/ui/core/CustomStyleClassSupport"
], function (jQuery, library, FormElement, CustomStyleClassSupport) {
    "use strict";

    /**
     * Constructor for a new PlottableAttributesFormElement.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * This control extends the regular FormElement to add a class to alter style when disabled.
     * @extends sap.ui.layout.form.FormElement
     * @alias hc.hph.patient.config.ui.lib.PlottableAttributesFormElement
     */
    var PlottableAttributesFormElement = FormElement.extend("hc.hph.patient.config.ui.lib.PlottableAttributesFormElement", {
        metadata: {
            library: "hc.hph.patient.config.ui.lib",
            properties: {
                /**
                 * Disabled for handling the change of the model to toggle style class.
                 */
                disabled: {
                    type: "boolean",
                    group: "Appearance",
                    defaultValue: false
                }
            }
        }
    });

    /**
     * Setter for the property Disabled.
     * Also adds a class to the control to add model dependent styling.
     * @override
     * @returns {hc.hph.patient.config.ui.lib.PlottableAttributesFormElement} Reference to this in order to allow method chaining
     */
    PlottableAttributesFormElement.prototype.setDisabled = function (bDisabled) {
        var sStyleClass = "sapPSDisabledFormElement";
        this.setProperty("disabled", bDisabled, true);
        if (bDisabled) {
            this.addStyleClass(sStyleClass);
        } else {
            this.removeStyleClass(sStyleClass);
        }

        return this;
    };

    CustomStyleClassSupport.apply(PlottableAttributesFormElement.prototype);
    return PlottableAttributesFormElement;
});
