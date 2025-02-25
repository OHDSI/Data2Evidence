sap.ui.define([
    "sap/ui/core/Renderer"
], function (Renderer) {
    "use strict";

    var TabExtensionPlaceholderRenderer = Renderer.extend("hc.hph.patient.app.ui.lib.tab.TabExtensionPlaceholderRenderer");

    TabExtensionPlaceholderRenderer.render = function (oRenderManager, oControl) {
        oRenderManager.write("<div");
        oRenderManager.writeControlData(oControl);
        oRenderManager.writeClasses();
        oRenderManager.write("/>");
    };

    return TabExtensionPlaceholderRenderer;
}, true);
