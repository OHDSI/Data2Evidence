sap.ui.define([
    "sap/ui/core/Renderer"
], function (Renderer) {
    "use strict";

    /**
     * Mini tile area renderer.
     * @namespace
     */
    var MiniTileAreaRenderer = Renderer.extend("sap.hc.hph.patient.app.ui.lib.timeline.MiniTileAreaRenderer");

    MiniTileAreaRenderer.render = function (oRenderManager, oMiniTileArea) {
        oRenderManager.write("<div");
        oRenderManager.writeControlData(oMiniTileArea);
        oRenderManager.addClass("sapTlTimelineMiniTileArea");
        oRenderManager.addClass("sapTlTimelineMiniTileArea" + oMiniTileArea.getColor());
        oRenderManager.writeClasses();
        oRenderManager.write("><canvas");
        oRenderManager.writeAttribute("id", oMiniTileArea.getId() + "-canvas");
        oRenderManager.write("/><svg");
        oRenderManager.writeAttribute("id", oMiniTileArea.getId() + "-svg");
        // Make this SVG not focusable, this is needed because IE11 does not support tabindex for SVGs yet and per default gives them focus during keyboard navigation
        // See: https://stackoverflow.com/questions/18646111/disable-onfocus-event-for-svg-element
        // In this case, this also prevents the generated __areaXY-svg from blocking the focus on the lane-canvas,
        // which would break the keyboard-zoom when clicking on a single minimized lane in IE11
        oRenderManager.writeAttribute("focusable", "false");
        oRenderManager.write("/></div>");
        this._bNeedsHardRerendering = false;
    };

    return MiniTileAreaRenderer;
}, true);
