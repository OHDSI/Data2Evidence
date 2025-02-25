sap.ui.define([
    "sap/ui/core/Renderer",
    "sap/hc/hph/patient/app/ui/lib/timeline/LaneBaseRenderer"
], function (Renderer, LaneBaseRenderer) {
    "use strict";

    /**
     * Lane renderer.
     * @namespace
     */
    var ChartRenderer = Renderer.extend("sap.hc.hph.patient.app.ui.lib.timeline.ChartRenderer");

    ChartRenderer.render = function (oRenderManager, oLane) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneFamily");
        oRenderManager.writeControlData(oLane);
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLane");
        oRenderManager.addClass("sapTlTimelineLaneFramed");
        oRenderManager.addClass("sapTlTimelineChart");
        if (oLane.getMinimized()) {
            oRenderManager.addClass("sapTlTimelineLaneMinimized");
        }
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        ChartRenderer.renderHeader(oRenderManager, oLane);
        ChartRenderer.renderBody(oRenderManager, oLane);
        oRenderManager.write("</div>");

        LaneBaseRenderer.renderSubLanes(oRenderManager, oLane);

        oRenderManager.write("</div>");
    };

    /**
     * Render chart lane description
     * @param  {object} oRenderManager render manager
     * @param  {object} oLane          chart lane to render
     *
     * @override
     */
    ChartRenderer.renderDescription = function (oRenderManager, oLane) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneDescription");
        oRenderManager.addClass("sapTlTimelineLaneDescription" + oLane.getColor());
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        // Interaction Name
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneDescriptionContext");
        oRenderManager.writeClasses();

        oRenderManager.write(">");
        oRenderManager.writeEscaped(oLane.getInteractionName());
        oRenderManager.write("</div>");

        // Most recent value
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneDescriptionCount");
        oRenderManager.writeClasses();
        if (oLane.getValueTooltip()) {
            oRenderManager.writeAttributeEscaped("title", oLane.getValueTooltip());
        }
        oRenderManager.write(">");
        oRenderManager.writeEscaped(String(oLane.getValue()));
        oRenderManager.write("</div>");

        // Attribute Name
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

    ChartRenderer.renderHeader = function (oRenderManager, oLane) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneHeader");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        ChartRenderer.renderDescription(oRenderManager, oLane);
        LaneBaseRenderer.renderOptions(oRenderManager, oLane);
        LaneBaseRenderer.renderExtraContent(oRenderManager, oLane);

        oRenderManager.write("</div>");
    };


    ChartRenderer.renderBody = function (oRenderManager, oLane) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneBody");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<canvas");
        oRenderManager.writeAttribute("id", oLane.getId() + "-canvas");
        oRenderManager.write("/><svg");
        // Make this SVG not focusable, this is needed because IE11 does not support tabindex for SVGs yet and per default gives them focus during keyboard navigation
        // See: https://stackoverflow.com/questions/18646111/disable-onfocus-event-for-svg-element
        oRenderManager.writeAttribute("focusable", "false");
        oRenderManager.write("><g>");
        oRenderManager.addClass("sapTlTimelineChartLine");
        oRenderManager.writeClasses();
        oRenderManager.write("></g>");
        oRenderManager.write("<g");
        oRenderManager.addClass("sapTlTimelineChartDots");
        oRenderManager.writeClasses();
        oRenderManager.write("></g>");
        oRenderManager.write("</svg>");
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineChartLabels");
        oRenderManager.writeClasses();
        oRenderManager.write("></div>");

        oRenderManager.write("</div>");
    };

    return ChartRenderer;
}, true);
