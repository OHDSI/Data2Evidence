sap.ui.define(function () {
    "use strict";

    /**
     * BoxplotChart renderer.
     * @namespace
     */
    var ChartPopoverContentRenderer = {};

    /**
     * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
     * @param {sap.ui.core.RenderManager} oRenderManager the RenderManager that can be used for writing to the
     *                                                   Render-Output-Buffer
     * @param {sap.ui.core.Control}       oControl       an object representation of the control that should be rendered
     */
    ChartPopoverContentRenderer.render = function (oRenderManager, oControl) {
        var sBaseClass = "sapHcMriPaChartPopoverContent";

        var aXAxisLabels = ["\uf005", "\uf003", "\uf002"];

        oRenderManager.write("<div");
        oRenderManager.writeControlData(oControl);
        oRenderManager.addClass(sBaseClass);
        oRenderManager.addClass(sBaseClass + oControl.getContext());
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<div");
        oRenderManager.addClass(sBaseClass + "Dimensions");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oControl.getDimensionValues().forEach(function (mDimension, iIndex) {
            oRenderManager.write("<div");
            oRenderManager.addClass(sBaseClass + "Dimension");
            oRenderManager.writeClasses();
            oRenderManager.write(">");

            oRenderManager.write("<label");
            oRenderManager.addClass(sBaseClass + "DimensionAxis");
            oRenderManager.writeClasses();
            oRenderManager.writeAttribute("for", oControl.getId() + "DimensionValue" + iIndex);
            oRenderManager.writeAttributeEscaped("title", mDimension.name);
            oRenderManager.write(">");
            oRenderManager.write(aXAxisLabels[iIndex]);
            oRenderManager.write("</label>");

            oRenderManager.write("<span");
            oRenderManager.writeAttribute("id", oControl.getId() + "DimensionValue" + iIndex);
            oRenderManager.addClass(sBaseClass + "DimensionValue");
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            oRenderManager.writeEscaped(mDimension.value.toString());
            oRenderManager.write("</span>");

            oRenderManager.write("</div>");
        });
        oRenderManager.write("</div>");

        oRenderManager.write("<div");
        oRenderManager.addClass(sBaseClass + "Measures");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oControl.getMeasureValues().forEach(function (mMeasure, iIndex) {
            oRenderManager.write("<label");
            oRenderManager.addClass(sBaseClass + "MeasureName");
            oRenderManager.writeClasses();
            oRenderManager.writeAttribute("for", oControl.getId() + "MeasureValue" + iIndex);
            oRenderManager.writeAttributeEscaped("title", mMeasure.name + " - " + mMeasure.type);
            oRenderManager.write(">");

            oRenderManager.write("<span");
            oRenderManager.addClass(sBaseClass + "MeasureAxis");
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            oRenderManager.write("\uf006");
            oRenderManager.write("</span>");

            oRenderManager.writeEscaped(mMeasure.type);
            oRenderManager.write("</label>");

            oRenderManager.write("<span");
            oRenderManager.writeAttribute("id", oControl.getId() + "MeasureValue" + iIndex);
            oRenderManager.addClass(sBaseClass + "MeasureValue");
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            oRenderManager.writeEscaped(mMeasure.value.toString());
            oRenderManager.write("</span>");
        });
        oRenderManager.write("</div>");

        if (typeof oControl.getPatientCount() !== "undefined") {
            oRenderManager.write("<div");
            oRenderManager.addClass(sBaseClass + "Patients");
            oRenderManager.writeClasses();
            oRenderManager.write(">");

            oRenderManager.write("<label");
            oRenderManager.addClass(sBaseClass + "PatientsLabel");
            oRenderManager.writeClasses();
            oRenderManager.writeAttribute("for", oControl.getId() + "PatientsValue");
            oRenderManager.write(">");
            oRenderManager.writeEscaped(oControl.getPatientCountLabel());
            oRenderManager.write("</label>");

            oRenderManager.write("<span");
            oRenderManager.writeAttribute("id", oControl.getId() + "PatientsValue");
            oRenderManager.addClass(sBaseClass + "PatientsValue");
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            oRenderManager.writeEscaped(oControl.getPatientCount().toString());
            oRenderManager.write("</span>");

            oRenderManager.write("</div>");
        }

        var iFurtherSelections = oControl.getSelectionCount() - 1;
        if (iFurtherSelections > 0) {
            oRenderManager.write("<div");
            oRenderManager.addClass(sBaseClass + "FurtherSelections");
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            oRenderManager.writeEscaped(oControl.getFurtherSelectionsLabel(iFurtherSelections));
            oRenderManager.write("</div>");
        }

        oRenderManager.write("</div>");
    };

    return ChartPopoverContentRenderer;
}, true);
