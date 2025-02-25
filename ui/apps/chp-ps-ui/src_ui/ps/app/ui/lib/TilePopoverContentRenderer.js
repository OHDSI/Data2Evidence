sap.ui.define([
    "./Tile"
], function (Tile) {
    "use strict";

    /**
     * TilePopoverContent renderer.
     * @namespace
     */
    var TilePopoverContentRenderer = {};

    /**
     * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
     * @param {sap.ui.core.RenderManager}                    oRenderManager      the RenderManager that can be used for
     *                                                                           writing to the Render-Output-Buffer
     * @param {sap.hc.hph.patient.app.ui.lib.TilePopoverContent} oTilePopoverContent an object representation of the
     *                                                                           control that should be rendered
     */
    TilePopoverContentRenderer.render = function (oRenderManager, oTilePopoverContent) {
        oRenderManager.write("<div");
        oRenderManager.writeControlData(oTilePopoverContent);
        oRenderManager.addClass("sapTlPopover");
        oRenderManager.addClass("sapTlPopover" + oTilePopoverContent.getColor());
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlPopoverHeader");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlPopoverBadge");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oRenderManager.writeEscaped(oTilePopoverContent.getCount().toString());
        oRenderManager.write("</div>");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlPopoverTitle");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oRenderManager.writeEscaped(oTilePopoverContent.getTitle());
        oRenderManager.write("</div>");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlPopoverTime");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oRenderManager.writeEscaped(oTilePopoverContent.getTime());
        oRenderManager.write("</div>");

        oRenderManager.write("</div>");

        oRenderManager.write("<div");
        oRenderManager.writeAttribute("tabindex", "0");
        oRenderManager.addClass("sapTlPopoverContent");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oTilePopoverContent.getTileInstances().forEach(function (oTile) {
            TilePopoverContentRenderer.renderTile(oRenderManager, oTile);
        });

        oRenderManager.write("</div>");

        oRenderManager.write("</div>");
    };

    TilePopoverContentRenderer.renderTile = function (oRenderManager, oTile) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlPopoverTile");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlPopoverTileTitle");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oRenderManager.writeEscaped(oTile.getName());
        oRenderManager.write("</div>");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlPopoverTileTime");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oRenderManager.writeEscaped(oTile.getTime());
        oRenderManager.write("</div>");

        oRenderManager.write("<dl");
        oRenderManager.addClass("sapTlPopoverTileDetails");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oTile.getAttributes().forEach(function (oTileAttribute) {
            TilePopoverContentRenderer.renderAttribute(oRenderManager, oTileAttribute);
        });
        oRenderManager.write("</dl>");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlPopoverTileActions");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oTile.getAnnotations().forEach(function (oAnnotation) {
            oAnnotation.getControls().forEach(function (oControl) {
                oRenderManager.renderControl(oControl);
            });
        });
        oRenderManager.write("</div>");

        oRenderManager.write("</div>");
    };

    TilePopoverContentRenderer.renderAttribute = function (oRenderManager, oTileAttribute) {
        oRenderManager.write("<dt");
        oRenderManager.addClass("sapTlPopoverTileDetailsKey");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oRenderManager.writeEscaped(Tile.getAttributeName(oTileAttribute));
        oRenderManager.write("</dt>");
        oRenderManager.write("<dd");
        oRenderManager.addClass("sapTlPopoverTileDetailsValue");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        Tile.getAttributeValues(oTileAttribute).forEach(function (sValue, iValueIndex, aValues) {
            oRenderManager.writeEscaped(sValue.toString());
            if (iValueIndex < aValues.length - 1) {
                oRenderManager.write("<br />");
            }
        });
        oRenderManager.write("</dd>");
    };

    return TilePopoverContentRenderer;
}, true);
