sap.ui.define([
    "sap/m/ObjectAttributeRenderer",
    "sap/ui/core/Renderer"
], function (ObjectAttributeRenderer, Renderer) {
    "use strict";

    /**
     * ColoredObjectAttribute renderer.
     * @namespace
     */
    var ColoredObjectAttributeRenderer = Renderer.extend(ObjectAttributeRenderer);

    return ColoredObjectAttributeRenderer;
}, true);
