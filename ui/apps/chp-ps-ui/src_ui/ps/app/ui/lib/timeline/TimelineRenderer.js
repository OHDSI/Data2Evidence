sap.ui.define([
    "jquery.sap.global",
    "sap/hc/hph/patient/app/ui/lib/utils/Utils",
    "./Timeline"
], function (jQuery, Utils, Timeline) {
    "use strict";

    /**
     * Timeline renderer.
     * @namespace
     */
    var TimelineRenderer = {};

    /**
     * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
     * @param {sap.ui.core.RenderManager}          oRenderManager the RenderManager that can be used for writing to the
     *                                                            Render-Output-Buffer
     * @param {sap.hc.hph.patient.app.ui.lib.timeline.Timeline} oTimeline      an object representation of the control that should be
     *                                                            rendered
     */
    TimelineRenderer.render = function (oRenderManager, oTimeline) {
        oRenderManager.write("<div");
        oRenderManager.writeControlData(oTimeline);
        oRenderManager.addClass("sapTlTimeline");
        if (oTimeline.getShowDatelessInteractions()) {
            oRenderManager.addClass("sapTlTimelineDateless");
        }
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        TimelineRenderer.renderMinimap(oRenderManager, oTimeline);

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneArea");
        oRenderManager.writeAttribute("id", oTimeline.getId() + "-area");
        oRenderManager.writeClasses();
        oRenderManager.writeAttribute("tabindex", "0");
        oRenderManager.write(">");

        TimelineRenderer.renderPointsInTime(oRenderManager, oTimeline);

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneAreaRight");
        oRenderManager.writeAttribute("id", oTimeline.getId() + "-area-right");
        oRenderManager.writeClasses();
        oRenderManager.write("/>");

        TimelineRenderer.renderRulerHeader(oRenderManager, oTimeline);
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLanes");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oTimeline.getLanes().forEach(function (oLane) {
            oRenderManager.renderControl(oLane);
        });
        oRenderManager.write("</div>");

        oRenderManager.write("</div>");
        if (oTimeline.getMinimap()) {
            TimelineRenderer.renderMinimapBrush(oRenderManager, oTimeline);
        }

        oRenderManager.write("</div>");
    };

    // Render SVG for the actual minimap with viewport handles and bracket
    TimelineRenderer.renderMinimap = function (oRenderManager, oTimeline) {
        oRenderManager.renderControl(oTimeline.getMinimap());
        oRenderManager.write("<svg");
        oRenderManager.writeAttribute("width", "100%");
        oRenderManager.writeAttribute("height", "100%");
        oRenderManager.addClass("sapTlTimelineBracket");
        oRenderManager.writeClasses();
        // Make this SVG not focusable, this is needed because IE11 does not support tabindex for SVGs yet and per default gives them focus during keyboard navigation
        // See: https://stackoverflow.com/questions/18646111/disable-onfocus-event-for-svg-element
        oRenderManager.writeAttribute("focusable", "false");
        oRenderManager.write("><g");
        oRenderManager.writeAttribute("transform", "translate(" + Timeline.TIMELINE_BRACKET_MARGIN + " " + Timeline.TIMELINE_BRACKET_MARGIN + ")");
        oRenderManager.write(">");
        oRenderManager.write("<g");
        oRenderManager.addClass("sapTlTimelineMap");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oRenderManager.write("</g>");
        oRenderManager.write("<path");
        oRenderManager.addClass("sapTlTimelineMapBrushInverseBegin");
        oRenderManager.writeClasses();
        oRenderManager.write("/><path");
        oRenderManager.addClass("sapTlTimelineMapBrushInverseEnd");
        oRenderManager.writeClasses();
        oRenderManager.write("/><path");
        oRenderManager.addClass("sapTlTimelineBracketPath");
        oRenderManager.writeClasses();
        oRenderManager.write("/></g>");
        oRenderManager.write("</svg>");
    };

    TimelineRenderer.renderPointsInTime = function (oRenderManager, oTimeline) {
        var mTexts = oTimeline.getTexts();

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneAreaPointsInTime");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        TimelineRenderer.renderRulerBody(oRenderManager);

        if (oTimeline.getDateOfBirth()) {
            oRenderManager.write("<div");
            oRenderManager.addClass("sapTlTimelineDOB");
            oRenderManager.writeClasses();
            var iDOBPosition = oTimeline.getScale()(oTimeline.getDateOfBirth());
            if (iDOBPosition > 0) {
                oRenderManager.addStyle("width", iDOBPosition + "px");
            } else {
                oRenderManager.addStyle("display", "none");
            }
            oRenderManager.writeStyles();
            oRenderManager.write(">");

            oRenderManager.write("<div");
            oRenderManager.addClass("sapTlTimelineDOBLine");
            oRenderManager.writeClasses();
            oRenderManager.writeAttribute("title", mTexts.dobTooltip);
            oRenderManager.write("/>");

            oRenderManager.write("</div>");
        }

        if (oTimeline.getDateOfDeath()) {
            oRenderManager.write("<div");
            oRenderManager.addClass("sapTlTimelineDOD");
            oRenderManager.writeClasses();
            var iDODPosition = oTimeline.getScale()(oTimeline.getDateOfDeath());
            if (iDODPosition < oTimeline.getScale().range()[1]) {
                oRenderManager.addStyle("left", iDODPosition + "px");
            } else {
                oRenderManager.addStyle("display", "none");
            }
            oRenderManager.writeStyles();
            oRenderManager.write(">");

            oRenderManager.write("<div");
            oRenderManager.addClass("sapTlTimelineDODLine");
            oRenderManager.writeClasses();
            oRenderManager.writeAttribute("title", mTexts.dodTooltip);
            oRenderManager.write("/>");

            oRenderManager.write("</div>");
        }

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineToday");
        oRenderManager.writeClasses();
        oRenderManager.writeAttribute("title", mTexts.todayTooltip);
        oRenderManager.addStyle("left", "calc(" + oTimeline.getScale()(new Date()) + "px - 0.5rem)");
        oRenderManager.writeStyles();
        oRenderManager.write("></div>");

        oRenderManager.write("</div>");
    };

    TimelineRenderer.renderRulerHeader = function (oRenderManager, oTimeline) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLane");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        // header part
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneHeader");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineBar");
        oRenderManager.addClass("sapTlTimelineEmptyBar");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        if (oTimeline.getShowDatelessInteractions()) {
            oRenderManager.write("<svg");
            oRenderManager.addClass("sapTlTimelineRuler");
            oRenderManager.addClass("sapTlTimelineRulerHeader");
            oRenderManager.writeClasses();
            // Make this SVG not focusable, this is needed because IE11 does not support tabindex for SVGs yet and per default gives them focus during keyboard navigation
            // See: https://stackoverflow.com/questions/18646111/disable-onfocus-event-for-svg-element
            oRenderManager.writeAttribute("focusable", "false");
            oRenderManager.write("><g");
            oRenderManager.addClass("tick");
            oRenderManager.writeClasses();
            oRenderManager.writeAttribute("transform", "translate(225, 48)");
            oRenderManager.write(">");
            oRenderManager.write("<title>");
            oRenderManager.writeEscaped(oTimeline.getDatelessInteractionsTooltip());
            oRenderManager.write("</title>");

            // vertical tick
            oRenderManager.write("<line");
            oRenderManager.writeAttribute("y2", -12);
            oRenderManager.writeAttribute("x2", 0);
            oRenderManager.write("/>");

            // question mark
            oRenderManager.write("<text");
            oRenderManager.writeAttribute("y", -15);
            oRenderManager.writeAttribute("x", 0);
            oRenderManager.write(">?</text>");
            oRenderManager.write("</g></svg>");
        }

        oRenderManager.write("</div>");

        oRenderManager.write("</div>");
        oRenderManager.write("</div>");
    };

    TimelineRenderer.renderRulerBody = function (oRenderManager) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLane");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        // body part
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneBody");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineBar");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<svg");
        oRenderManager.addClass("sapTlTimelineRuler");
        oRenderManager.writeClasses();
        // Make this SVG not focusable, this is needed because IE11 does not support tabindex for SVGs yet and per default gives them focus during keyboard navigation
        // See: https://stackoverflow.com/questions/18646111/disable-onfocus-event-for-svg-element
        oRenderManager.writeAttribute("focusable", "false");
        oRenderManager.write("><g");
        oRenderManager.addClass("sapTlTimelineRulerAxes");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<g");
        oRenderManager.addClass("sapTlTimelineRulerUpperAxis");
        oRenderManager.writeClasses();
        if (sap.ui.Device.browser.msie || sap.ui.Device.browser.edge || sap.ui.Device.browser.safari) {
            // IE, Edge, and Safari don't support transform properties set in CSS yet, so we add it as DOM attribute here.
            oRenderManager.writeAttribute("transform", "translate(0, 18)");
        }
        oRenderManager.write("></g>");

        oRenderManager.write("<g");
        oRenderManager.addClass("sapTlTimelineRulerLowerAxis");
        oRenderManager.writeClasses();
        if (sap.ui.Device.browser.msie || sap.ui.Device.browser.edge || sap.ui.Device.browser.safari) {
            // IE, Edge, and Safari don't support transform properties set in CSS yet, so we add it as DOM attribute here.
            oRenderManager.writeAttribute("transform", "translate(0, 48)");
        }
        oRenderManager.write("></g>");
        oRenderManager.write("</g></svg>");

        oRenderManager.write("</div>");
        oRenderManager.write("</div>");

        oRenderManager.write("</div>");
    };

    // Place an SVG of the size of the minimap that will later be used to
    // 1. Contain the D3 brush element to resize the viewport
    // 2. Define the size of the overlayed SVG (class sapTlTimelineBracket) that will be used to render the actual minimap with viewport handles and bracket
    TimelineRenderer.renderMinimapBrush = function (oRenderManager, oTimeline) {
        var iMinimapHeight = oTimeline.getMinimap().getHeight();
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLane");
        oRenderManager.addClass("sapTlTimelineMinimapPlaceholder");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        // header part
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneHeader");
        oRenderManager.writeClasses();
        oRenderManager.write("></div>");

        // body part
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneBody");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        // SVG with only invisible D3 brush elements
        oRenderManager.write("<svg");
        oRenderManager.writeAttribute("height", iMinimapHeight);
        // Make this SVG not focusable, this is needed because IE11 does not support tabindex for SVGs yet and per default gives them focus during keyboard navigation
        // See: https://stackoverflow.com/questions/18646111/disable-onfocus-event-for-svg-element
        oRenderManager.writeAttribute("focusable", "false");
        oRenderManager.write("/>");

        oRenderManager.write("</div>");
        oRenderManager.write("</div>");
    };

    return TimelineRenderer;
}, true);
