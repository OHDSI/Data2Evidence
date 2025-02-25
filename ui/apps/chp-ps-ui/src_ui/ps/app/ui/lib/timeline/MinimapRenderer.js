sap.ui.define([
    "./MinimapLaneRenderer",
    "sap/ui/core/Renderer",
    "sap/ui/thirdparty/d3"
], function (MinimapLaneRenderer, Renderer) {
    "use strict";

    /**
     * Minimap renderer.
     * @namespace
     */
    var MinimapRenderer = Renderer.extend("sap.hc.hph.patient.app.ui.lib.timeline.MinimapRenderer");

    MinimapRenderer.render = function (oRenderManager, oMinimap) {
        var iMinimapHeight = oMinimap.getHeight();
        oRenderManager.write("<svg");
        oRenderManager.writeControlData(oMinimap);
        oRenderManager.addClass("sapTlTimelineMinimap");
        oRenderManager.writeClasses();
        oRenderManager.writeAttribute("height", iMinimapHeight);
        // Make this SVG not focusable, this is needed because IE11 does not support tabindex for SVGs yet and per default gives them focus during keyboard navigation
        // See: https://stackoverflow.com/questions/18646111/disable-onfocus-event-for-svg-element
        oRenderManager.writeAttribute("focusable", "false");
        oRenderManager.write("><g");
        oRenderManager.writeAttribute("id", oMinimap.getId() + "-pit");
        oRenderManager.write("/><g");
        oRenderManager.writeAttribute("id", oMinimap.getId() + "-lanes");
        oRenderManager.write("/>");
        oRenderManager.write("</svg>");
    };

    MinimapRenderer.renderLanes = function (oDom, oMinimap) {
        var aLanes = oMinimap.getLanes().filter(function (oMinimapLane) {
            return oMinimapLane.getVisible();
        });
        var lane = d3.select(oDom).selectAll(".sapTlTimelineMinimapLane")
            .data(aLanes, function (oLane) {
                return oLane.getId();
            })
            .each(function (d, i) {
                return MinimapLaneRenderer.renderD3Update(this, d, i);
            });

        lane.enter()
            .append(MinimapLaneRenderer.renderD3Enter);

        lane.exit()
            .each(function () {
                return MinimapLaneRenderer.renderD3Exit(this);
            });
    };

    return MinimapRenderer;
}, true);
