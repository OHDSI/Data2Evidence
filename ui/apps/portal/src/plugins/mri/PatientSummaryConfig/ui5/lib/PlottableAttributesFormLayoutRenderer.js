sap.ui.define([
    "jquery.sap.global",
    "sap/ui/layout/form/FormLayoutRenderer",
    "sap/ui/core/Renderer"
], function (jQuery, FormLayoutRenderer, Renderer) {
    "use strict";

    /**
     * PlottableAttributesFormLayout renderer.
     * @namespace
     */
    var PlottableAttributesFormLayoutRenderer = Renderer.extend(FormLayoutRenderer);

    PlottableAttributesFormLayoutRenderer.renderElement = function (rm, oLayout, oElement) {
        var oLabel = oElement.getLabelControl();

        rm.write("<div");
        rm.writeElementData(oElement);
        rm.addClass("sapUiFormElement");
        if (oLabel) {
            rm.addClass("sapUiFormElementLbl");
        }
        if (oElement.getDisabled instanceof Function && oElement.getDisabled()) {
            rm.addClass("sapPSDisabledFormElement");
        }

        rm.writeClasses();
        rm.write(">");

        if (oLabel) {
            rm.renderControl(oLabel);
        }

        var aFields = oElement.getFields();
        if (aFields && aFields.length > 0) {
            for (var k = 0, kl = aFields.length; k < kl; k++) {
                var oField = aFields[k];
                rm.renderControl(oField);
            }
        }
        rm.write("</div>");
    };

    return PlottableAttributesFormLayoutRenderer;
}, true);
