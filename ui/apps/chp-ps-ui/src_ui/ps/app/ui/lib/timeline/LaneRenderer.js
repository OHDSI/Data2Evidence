sap.ui.define([
    "sap/ui/core/Renderer",
    "sap/hc/hph/patient/app/ui/lib/timeline/LaneBaseRenderer"
], function (Renderer, LaneBaseRenderer) {
    "use strict";

    /**
     * Lane renderer.
     * @namespace
     */
    var LaneRenderer = Renderer.extend("sap.hc.hph.patient.app.ui.lib.timeline.LaneRenderer");

    LaneRenderer.render = function (oRenderManager, oLane) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneFamily");
        oRenderManager.writeControlData(oLane);
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLane");
        oRenderManager.addClass("sapTlTimelineLaneFramed");
        if (oLane.getMinimized()) {
            oRenderManager.addClass("sapTlTimelineLaneMinimized");
        }
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        LaneBaseRenderer.renderHeader(oRenderManager, oLane);
        LaneRenderer.renderBody(oRenderManager, oLane);
        oRenderManager.write("</div>");

        LaneBaseRenderer.renderSubLanes(oRenderManager, oLane);

        oRenderManager.write("</div>");
        oLane._bNeedsHardRerendering = false;
    };

    LaneRenderer.renderBody = function (oRenderManager, oLane) {
        oRenderManager.write("<div");
        oRenderManager.writeAttribute("id", oLane.getId() + "-body");
        oRenderManager.addClass("sapTlTimelineLaneBody");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oLane.getContent().forEach(function (oControl) {
            oRenderManager.renderControl(oControl);
        });

        oRenderManager.write("</div>");
    };

    return LaneRenderer;
}, true);
