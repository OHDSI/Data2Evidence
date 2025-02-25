sap.ui.define([
    "sap/ui/core/Renderer"
], function (Renderer) {
    "use strict";

    /**
     * LaneBase renderer.
     * @namespace
     */
    var LaneBaseRenderer = Renderer.extend("sap.hc.hph.patient.app.ui.lib.timeline.LaneBaseRenderer");

    /**
     * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
     * @param {sap.ui.core.RenderManager}      oRenderManager the RenderManager that can be used for writing to the
     *                                                        Render-Output-Buffer
     * @param {sap.hc.hph.patient.app.ui.lib.timeline.Lane} oLane   an object representation of the control that should be
     *                                                        rendered
     */
    LaneBaseRenderer.render = function (oRenderManager, oLane) {
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
        LaneBaseRenderer.renderBody(oRenderManager, oLane);
        oRenderManager.write("</div>");

        LaneBaseRenderer.renderSubLanes(oRenderManager, oLane);

        oRenderManager.write("</div>");
    };

    // 1. Lane description, i.e. number of interactions and title
    LaneBaseRenderer.renderDescription = function (oRenderManager, oLane) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneDescription");
        oRenderManager.addClass("sapTlTimelineLaneDescription" + oLane.getColor());
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneDescriptionCount");
        oRenderManager.writeClasses();
        if (oLane.getValueTooltip()) {
            oRenderManager.writeAttributeEscaped("title", oLane.getValueTooltip());
        }
        oRenderManager.write(">");
        oRenderManager.writeEscaped(String(oLane.getValue()));
        oRenderManager.write("</div>");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneDescriptionTitle");
        oRenderManager.writeClasses();
        if (oLane.getTitleTooltip()) {
            oRenderManager.writeAttributeEscaped("title", oLane.getTitleTooltip());
        }
        oRenderManager.write(">");
        oRenderManager.writeEscaped(oLane.getTitle());
        oRenderManager.write("</div>");

        oRenderManager.write("</div>");
    };

    // 2. Optional buttons to expand/collapse lane or to add charts
    LaneBaseRenderer.renderOptions = function (oRenderManager, oLane) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneHeaderContent");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oLane.getHeaderContent().forEach(function (oControl) {
            oRenderManager.renderControl(oControl);
        });
        oRenderManager.write("</div>");
    };

    // 3. Separate section for extra content, e.g. number of dateless interactions
    LaneBaseRenderer.renderExtraContent = function (oRenderManager, oLane) {
        if (oLane.getTimeline() && oLane.getTimeline().getShowDatelessInteractions()) {
            oRenderManager.write("<div");
            oRenderManager.addClass("sapTlTimelineLaneHeaderExtraContentSeparator");
            oRenderManager.writeClasses();
            oRenderManager.write("></div>");

            oRenderManager.write("<div");
            oRenderManager.addClass("sapTlTimelineLaneHeaderExtraContent");
            oRenderManager.addClass("sapTlTimelineLaneHeaderExtraContent" + oLane.getColor());
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            oLane.getHeaderExtraContent().forEach(function (oControl) {
                oRenderManager.renderControl(oControl);
            });
            oRenderManager.write("</div>");
        }
    };

    LaneBaseRenderer.renderHeader = function (oRenderManager, oLane) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneHeader");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        LaneBaseRenderer.renderDescription(oRenderManager, oLane);
        LaneBaseRenderer.renderOptions(oRenderManager, oLane);
        LaneBaseRenderer.renderExtraContent(oRenderManager, oLane);

        oRenderManager.write("</div>");
    };

    LaneBaseRenderer.renderBody = function (oRenderManager) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneBody");
        oRenderManager.writeClasses();
        oRenderManager.write("/>");
    };

    LaneBaseRenderer.renderSubLanes = function (oRenderManager, oLane) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineSubLanes");
        oRenderManager.addClass("sapTlTimelineSubLanes" + oLane.getColor());
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oLane.getSubLanes().forEach(function (oSubLane) {
            oRenderManager.renderControl(oSubLane);
        });

        oRenderManager.write("</div>");
    };

    return LaneBaseRenderer;
}, true);
