sap.ui.define([
    "sap/m/ToolbarRenderer",
    "sap/ui/core/Renderer"
], function (ToolbarRenderer, Renderer) {
    "use strict";

    /**
     * OverviewToolbar renderer.
     * @namespace
     */
    var OverviewToolbarRenderer = Renderer.extend(ToolbarRenderer);

    OverviewToolbarRenderer.renderBarContent = function (oRenderManager, oToolbar) {
        oToolbar._getVisibleContent().forEach(function (oControl) {
            sap.m.BarInPageEnabler.addChildClassTo(oControl, oToolbar);
            oRenderManager.renderControl(oControl);
        });

        if (oToolbar._getOverflowButtonNeeded()) {
            OverviewToolbarRenderer.renderOverflowButton(oRenderManager, oToolbar);
        }
    };

    OverviewToolbarRenderer.renderOverflowButton = function (rm, oToolbar) {
        var oOverflowButton = oToolbar._getOverflowButton();
        sap.m.BarInPageEnabler.addChildClassTo(oOverflowButton, oToolbar);
        rm.renderControl(oOverflowButton);
    };

    return OverviewToolbarRenderer;
}, true);
