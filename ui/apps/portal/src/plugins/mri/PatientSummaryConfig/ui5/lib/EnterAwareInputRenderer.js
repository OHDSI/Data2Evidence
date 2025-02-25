sap.ui.define([
    "jquery.sap.global",
    "sap/m/InputRenderer",
    "sap/ui/core/Renderer"
], function (jQuery, InputRenderer, Renderer) {
    "use strict";

    /**
     * EnterAwareInput renderer.
     * @namespace
     */
    var EnterAwareInputRenderer = Renderer.extend(InputRenderer);

    return EnterAwareInputRenderer;
}, true);
