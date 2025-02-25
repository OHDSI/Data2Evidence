sap.ui.define([
    "./OverviewListItem",
    "sap/m/ListItemBaseRenderer",
    "sap/ui/core/Renderer"
], function (OverviewListItem, ListItemBaseRenderer, Renderer) {
    "use strict";

    /**
     * OverviewListItem renderer.
     * @namespace
     */
    var OverviewListItemRenderer = Renderer.extend(ListItemBaseRenderer);

    /**
     * Add ListAttributes to the provided {@link sap.ui.core.RenderManager}.
     * @param {sap.ui.core.RenderManager}                  oRenderManager    the RenderManager that can be used for
     *                                                                       writing to the Render-Output-Buffer
     * @param {hc.hph.patient.app.ui.lib.OverviewListItem} oOverviewListItem an object representation of the control
     *                                                                       that should be rendered
     */
    OverviewListItemRenderer.renderLIAttributes = function (oRenderManager, oOverviewListItem) {
        oRenderManager.addClass("sapTlOverviewListItem");
        oRenderManager.addClass("sapTlOverviewListItem" + oOverviewListItem.getColor());
    };

    /**
     * Renders the content of the list item, using the provided {@link sap.ui.core.RenderManager}.
     * @param {sap.ui.core.RenderManager}                  oRenderManager    the RenderManager that can be used for
     *                                                                       writing to the Render-Output-Buffer
     * @param {hc.hph.patient.app.ui.lib.OverviewListItem} oOverviewListItem an object representation of the control
     *                                                                       that should be rendered
     */
    OverviewListItemRenderer.renderLIContent = function (oRenderManager, oOverviewListItem) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlOverviewListItemTime");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oRenderManager.writeEscaped(oOverviewListItem.getTime());
        oRenderManager.write("</div>");

        if (oOverviewListItem.isDated()) {
            oRenderManager.write("<div");
            oRenderManager.addClass("sapTlOverviewListItemTimeVisualBackground");
            oRenderManager.writeClasses();
            oRenderManager.write(">");

            oRenderManager.write("<div");
            oRenderManager.addClass("sapTlOverviewListItemTimeVisual");
            var sTimeClass = "sapTlOverviewListItemTimeVisual" + (oOverviewListItem.isPoint() ? "Point" : "Duration");
            oRenderManager.addClass(sTimeClass);
            oRenderManager.writeClasses();
            oRenderManager.write("></div>");

            oRenderManager.write("</div>");
        } else {
            oRenderManager.write("<div");
            oRenderManager.addClass("sapTlOverviewListItemTimeVisualBackgroundDateless");
            oRenderManager.writeClasses();
            oRenderManager.write(">");

            oRenderManager.write("</div>");
        }

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlOverviewListItemContent");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlOverviewListItemTitle");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlOverviewListItemName");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oRenderManager.writeEscaped(oOverviewListItem.getName().toString());
        oRenderManager.write("</div>");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlOverviewListItemGroupName");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oRenderManager.writeEscaped(oOverviewListItem.getGroupName().toString());
        oRenderManager.write("</div>");

        oRenderManager.write("</div>");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlOverviewListItemDetails");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<table");
        oRenderManager.addClass("sapTlOverviewListItemDetailsTable");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oOverviewListItem.getAttributes().forEach(function (oOverviewListItemAttribute) {
            oRenderManager.write("<tr>");

            oRenderManager.write("<td");
            oRenderManager.addClass("sapTlOverviewListItemDetailsKey");
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            oRenderManager.writeEscaped(OverviewListItem.getAttributeName(oOverviewListItemAttribute));
            oRenderManager.write("</td>");

            oRenderManager.write("<td");
            oRenderManager.addClass("sapTlOverviewListItemDetailsValue");
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            oRenderManager.writeEscaped(OverviewListItem.getAttributeValues(oOverviewListItemAttribute).join(", "));
            oRenderManager.write("</td>");

            oRenderManager.write("</tr>");
        });
        oRenderManager.write("</table>");

        oRenderManager.write("</div>");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlOverviewListItemActions");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oOverviewListItem.getAnnotations().forEach(function (oAnnotation) {
            oAnnotation.getControls().forEach(function (oControl) {
                oRenderManager.renderControl(oControl);
            });
        });
        oRenderManager.write("</div>");

        oRenderManager.write("</div>");
    };

    return OverviewListItemRenderer;
}, true);
