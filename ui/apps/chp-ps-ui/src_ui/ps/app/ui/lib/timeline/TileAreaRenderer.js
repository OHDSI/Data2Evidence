sap.ui.define([
    "sap/ui/core/Renderer"
], function (Renderer) {
    "use strict";

    /**
     * Tile area renderer.
     * @namespace
     */
    var TileAreaRenderer = Renderer.extend("sap.hc.hph.patient.app.ui.lib.timeline.TileAreaRenderer");

    TileAreaRenderer.render = function (oRenderManager, oTileArea) {
        oRenderManager.write("<div");
        oRenderManager.writeControlData(oTileArea);
        oRenderManager.addClass("sapTlTiles");
        oRenderManager.addClass("sapTlTiles" + oTileArea.getColor());
        oRenderManager.writeClasses();
        oRenderManager.write("/>");
        this._bNeedsHardRerendering = false;
    };

    return TileAreaRenderer;
}, true);
