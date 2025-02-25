sap.ui.define([
    "jquery.sap.global",
    "./library",
    "sap/ui/layout/form/FormLayout"
], function (jQuery, library, FormLayout) {
    "use strict";

    /**
     * Constructor for a new PlottableAttributesFormLayout.
     * @constructor
     * @param {string} [sId]       id for the form, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new form
     *
     * @classdesc
     * This control extends the regular FormLayout to add a class to alter style when disabled.
     * @extends sap.ui.layout.form.FormLayout
     * @alias hc.hph.patient.config.ui.lib.PlottableAttributesFormLayout
     */
    var PlottableAttributesFormLayout = FormLayout.extend("hc.hph.patient.config.ui.lib.PlottableAttributesFormLayout", {});

    return PlottableAttributesFormLayout;
});
