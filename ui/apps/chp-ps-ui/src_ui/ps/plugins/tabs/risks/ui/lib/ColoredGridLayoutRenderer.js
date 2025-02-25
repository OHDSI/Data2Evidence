sap.ui.define([
    "sap/ui/layout/form/ResponsiveGridLayoutRenderer",
    "sap/ui/core/Renderer"
], function (ResponsiveGridLayoutRenderer, Renderer) {
    "use strict";

    /**
     * ColoredGridLayoutRenderer renderer.
     * @namespace
     */
    var ColoredGridLayoutRenderer = Renderer.extend(ResponsiveGridLayoutRenderer);

    return ColoredGridLayoutRenderer;
}, true);
