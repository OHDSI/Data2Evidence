sap.ui.define(function () {
    "use strict";

    /**
     * BoxplotChart renderer.
     * @namespace
     */
    var BoxplotRenderer = {};

    /**
     * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
     * @param {sap.ui.core.RenderManager} oRenderManager the RenderManager that can be used for writing to the
     *                                                   Render-Output-Buffer
     * @param {sap.ui.core.Control}       oControl       an object representation of the control that should be rendered
     */
    BoxplotRenderer.render = function (oRenderManager, oControl) {
        oRenderManager.write("<div");
        oRenderManager.writeControlData(oControl);
        oRenderManager.addClass(oControl.getClass());
        oRenderManager.writeClasses();
        oRenderManager.addStyle("width", oControl.getWidth());
        oRenderManager.addStyle("height", oControl.getHeight());
        oRenderManager.writeStyles();
        oRenderManager.write(">");
        var aData = oControl.getData();
        var aDimensions = oControl.getDimensions();
        if (Array.isArray(aData) && Array.isArray(aDimensions)) {
            if (aData.length && aDimensions.length) {
                oRenderManager.write("<svg></svg>");
                oRenderManager.write("<div");
                oRenderManager.addClass(oControl.getClass("Tooltip"));
                oRenderManager.writeClasses();
                oRenderManager.write(">");
                oRenderManager.renderControl(oControl._oInfoContent);
                oRenderManager.write("</div>");
            } else {
                oRenderManager.renderControl(oControl.getNoData());
            }
        }
        oRenderManager.write("</div>");
    };

    return BoxplotRenderer;
}, true);
