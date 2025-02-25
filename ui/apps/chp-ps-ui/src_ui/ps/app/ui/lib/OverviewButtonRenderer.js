sap.ui.define([
    "jquery.sap.global",
    "sap/m/ToggleButtonRenderer",
    "sap/ui/core/Renderer"
], function (jQuery, ToggleButtonRenderer, Renderer) {
    "use strict";

    /**
     * OverviewButton renderer.
     * @namespace
     */
    var OverviewButtonRenderer = Renderer.extend(ToggleButtonRenderer);

    /**
     * Callback for specific rendering of inner button attributes.
     * @param {sap.ui.core.RenderManager}                oRm             the RenderManager currently rendering this
     *                                                                   control
     * @param {sap.hc.hph.patient.app.ui.lib.OverviewButton} oOverviewButton the OverviewButton that should be rendered
     */
    OverviewButtonRenderer.renderButtonAttributes = function (oRm, oOverviewButton) {
        if (oOverviewButton.getPressed()) {
            oRm.addClass("sapMToggleBtnPressed");
        }
        oRm.addClass("sapMBtnInner");
    };

    return OverviewButtonRenderer;
}, true);
