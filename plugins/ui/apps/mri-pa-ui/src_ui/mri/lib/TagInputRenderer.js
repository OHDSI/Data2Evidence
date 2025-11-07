sap.ui.define([
    "jquery.sap.global",
    "sap/ui/commons/ComboBoxRenderer",
    "sap/ui/core/Renderer"
], function (jQuery, ComboBoxRenderer, Renderer) {
    "use strict";

    /**
     * TagInputRenderer renderer.
     * @namespace
     */
    var TagInputRenderer = Renderer.extend(ComboBoxRenderer);

    /**
     * Overwrite outer content rendering to add tags.
     * @param {object} oRenderManager RenderManager
     * @param {object} oControl       TagInput Control
     */
    TagInputRenderer.renderOuterContentBefore = function (oRenderManager, oControl) {
        ComboBoxRenderer.renderOuterContentBefore.apply(this, arguments);
        oControl.getMyTags().forEach(function (oTag) {
            oRenderManager.renderControl(oTag);
        });
    };

    /**
     * Add specific class for this control
     * @param {object} oRenderManager RenderManager
     */
    TagInputRenderer.renderOuterAttributes = function (oRenderManager) {
        ComboBoxRenderer.renderOuterAttributes.apply(this, arguments);
        oRenderManager.addClass("tagInput");
    };

    return TagInputRenderer;
}, true);
